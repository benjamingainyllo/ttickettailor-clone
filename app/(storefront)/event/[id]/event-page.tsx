"use client";

import { useEffect, useState, useTransition } from "react";
import { getEventById, type PublicProduct, type PublicTicketType } from "@/app/actions/events";
import { MerchPicker, type Basket } from "@/components/storefront/merch-picker";
import { createCheckoutSession } from "@/app/actions/checkout";
import { bandFeeKobo, formatKobo } from "@/lib/money";
import { formatE164, toE164 } from "@/lib/whatsapp/phone";
import { Loader2, Calendar, MapPin, Users, ExternalLink, CheckCircle2, Minus, Plus } from "lucide-react";

export function EventCheckoutPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<PublicTicketType[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  /** productId -> what the buyer picked. Absent means not in the basket. */
  const [basket, setBasket] = useState<Basket>({});
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [registered, setRegistered] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      try {
        const res = await getEventById(params.id);
        if (!active) return;
        if (res.success && res.event) {
          setEvent(res.event);
          setHost(res.host ?? null);
          setTicketTypes(res.ticketTypes ?? []);
          setProducts(res.products ?? []);
          // Preselect the first tier a buyer can actually buy, so a
          // single-tier event needs no choosing at all.
          const firstAvailable = (res.ticketTypes ?? []).find((t) => t.available);
          setSelectedTierId(firstAvailable?.id ?? null);
        }
      } finally {
        // Always resolve loading, even when the query fails, so the page
        // never sits on an indefinite spinner.
        if (active) setLoading(false);
      }
    }

    loadEvent();
    return () => {
      active = false;
    };
  }, [params.id]);

  const selectedTier = ticketTypes.find((t) => t.id === selectedTierId) ?? null;
  const priceKobo = selectedTier?.priceKobo ?? Number(event?.price_kobo ?? 0);
  const isFree = priceKobo === 0;
  const subtotalKobo = priceKobo * quantity;

  // Some organisers add our fee to the buyer's total rather than absorbing
  // it. When they do, it is shown as its own line here — a fee the buyer
  // only discovers on the payment screen is the reason people abandon
  // checkouts, and it would be the organiser who paid for that.
  const passFee = Boolean(event?.pass_fee_to_buyer) && !isFree;
  const feeKobo = passFee ? bandFeeKobo(priceKobo) * quantity : 0;

  const merchKobo = products.reduce((sum, p) => {
    const picked = basket[p.id];
    return picked ? sum + p.priceKobo * picked.quantity : sum;
  }, 0);

  const totalKobo = subtotalKobo + feeKobo + merchKobo;

  // A free ticket with a paid shirt is still a paid order.
  const payingSomething = totalKobo > 0;

  // The most this tier will sell in one go: its own per-order cap, and
  // never more than it has left.
  const maxQuantity = selectedTier
    ? Math.max(
        1,
        Math.min(
          selectedTier.maxPerOrder,
          selectedTier.remaining ?? selectedTier.maxPerOrder
        )
      )
    : 1;

  const nothingOnSale = ticketTypes.length === 0 || !ticketTypes.some((t) => t.available);

  // Clamp if the buyer picks a smaller tier after choosing a big quantity.
  useEffect(() => {
    setQuantity((current) => Math.min(current, maxQuantity));
  }, [maxQuantity]);

  /** Normalised now, so a typo is caught before money moves, not after. */
  const phoneE164 = toE164(phone);

  const handleCheckout = () => {
    if (!phoneE164) {
      setCheckoutError("Check the WhatsApp number — that doesn't look right.");
      return;
    }
    if (!email) {
      setCheckoutError("Please enter your email.");
      return;
    }
    setCheckoutError(null);

    startTransition(async () => {
      const res = await createCheckoutSession({
        itemType: "event",
        itemId: event.id,
        buyerEmail: email,
        buyerName: name || undefined,
        buyerPhone: phoneE164,
        ticketTypeId: selectedTierId ?? undefined,
        quantity,
        products: Object.entries(basket)
          .filter(([, picked]) => picked.quantity > 0)
          .map(([productId, picked]) => ({
            productId,
            variant: picked.variant,
            quantity: picked.quantity,
          })),
      });

      if (res.success && res.completedWithoutPayment) {
        setRegistered(true);
      } else if (res.success && res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      } else {
        setCheckoutError(res.error || "Something went wrong.");
      }
    });
  };

  /* ── Daylight, in the shape of an invitation ─────────────────────
     The title is the biggest thing on the page and the flyer sits beside
     it, because this is what a promoter shares into a group chat and what
     a buyer decides from. What it replaces was a 448px dark card with the
     title at 24px and the artwork squashed into a 176px strip on top.
     ─────────────────────────────────────────────────────────────── */
  const panel = "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";
  const label = "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";
  const field =
    "w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3 text-[15px] outline-none placeholder:text-[var(--dl-ink-faint)]";

  if (loading) {
    return (
      <div className="dl flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--dl-ink-faint)]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="dl flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center font-[family-name:var(--font-bricolage-grotesque)]">
        <p className="text-[24px] font-extrabold tracking-[-0.03em]">Event not found</p>
        <p className="text-[15px] text-[var(--dl-ink-soft)]">
          This event may have been removed, or it isn&apos;t published yet.
        </p>
      </div>
    );
  }

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("en-NG", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Date to be announced";

  const hostName =
    [host?.first_name, host?.last_name].filter(Boolean).join(" ") || host?.handle || null;

  return (
    <div className="dl min-h-screen font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <a href="/" className="mb-10 inline-block text-[17px] font-extrabold tracking-[-0.03em]">
          Paylance
        </a>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16">
          {/* ── What it is ─────────────────────────────────── */}
          <div className="min-w-0">
            <h1 className="text-[40px] font-extrabold leading-[0.98] tracking-[-0.045em] sm:text-[56px]">
              {event.title}
            </h1>

            <p className="mt-6 text-[19px] font-bold leading-[1.35] sm:text-[22px]">
              {formattedDate}
              {event.time ? (
                <>
                  <br />
                  <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic tracking-[-0.01em]">
                    Doors {event.time}
                  </span>
                </>
              ) : null}
            </p>

            {hostName && (
              <div className="mt-8 flex items-center gap-3">
                {host?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={host.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-[3px] border-2 border-[var(--dl-line)] object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] text-[14px] font-extrabold">
                    {hostName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className={label}>Hosted by</p>
                  {host?.handle ? (
                    <a href={`/${host.handle}`} className="text-[15px] font-extrabold hover:underline">
                      {hostName}
                    </a>
                  ) : (
                    <p className="text-[15px] font-extrabold">{hostName}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-start gap-3">
              <MapPin className="mt-[3px] h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold">{event.location || "Online"}</p>
                {event.map_link && (
                  <a
                    href={event.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[13.5px] font-bold underline underline-offset-2"
                  >
                    Open the map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {event.description && (
              <p className="mt-8 max-w-[62ch] whitespace-pre-line text-[16px] leading-[1.65] text-[var(--dl-ink-soft)]">
                {event.description}
              </p>
            )}

            <div className="mt-8 flex items-center gap-2.5 border-t-2 border-[var(--dl-line)] pt-5">
              <Users className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <p className="text-[15px] font-bold">
                {event.attendees_count || 0} going
              </p>
            </div>
          </div>

          {/* ── The flyer, and getting in ───────────────────── */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className={`${panel} aspect-[4/5] w-full overflow-hidden`}>
              {event.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Calendar className="h-10 w-10 text-[var(--dl-ink-faint)]" />
                </div>
              )}
            </div>

            {registered ? (
              <div className={`${panel} mt-5 p-6 text-center`}>
                <CheckCircle2 className="mx-auto h-8 w-8" strokeWidth={2} />
                <p className="mt-3 text-[18px] font-extrabold tracking-[-0.02em]">You&apos;re in</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                  We sent {quantity > 1 ? `${quantity} tickets` : "your ticket"} to {email}.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {nothingOnSale ? (
                  <div className={`${panel} p-5 text-center`}>
                    <p className="text-[15px] font-extrabold">Nothing on sale right now</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                      {ticketTypes.some((t) => t.soldOut)
                        ? "Every ticket for this event has gone."
                        : "The organiser hasn't opened sales yet."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Only worth choosing between when there's a choice. */}
                    {ticketTypes.length > 1 && (
                      <div className="space-y-2">
                        <p className={label}>Ticket</p>
                        {ticketTypes.map((tier) => {
                          const selected = tier.id === selectedTierId;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              disabled={!tier.available}
                              onClick={() => setSelectedTierId(tier.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-[3px] border-2 p-4 text-left transition-colors ${
                                selected
                                  ? "border-[var(--dl-line)] bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                                  : "border-[var(--dl-line)] bg-[var(--dl-panel)]"
                              } ${tier.available ? "" : "cursor-not-allowed opacity-45"}`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[14.5px] font-extrabold">
                                  {tier.name}
                                </span>
                                {tier.description && (
                                  <span
                                    className={`mt-0.5 block truncate text-[12.5px] ${
                                      selected ? "opacity-75" : "text-[var(--dl-ink-soft)]"
                                    }`}
                                  >
                                    {tier.description}
                                  </span>
                                )}
                                {tier.soldOut ? (
                                  <span className="mt-1 block text-[12px] font-extrabold uppercase tracking-[0.1em]">
                                    Sold out
                                  </span>
                                ) : tier.notYetOpen ? (
                                  <span className="mt-1 block text-[12px]">Not on sale yet</span>
                                ) : tier.closed ? (
                                  <span className="mt-1 block text-[12px]">Sales closed</span>
                                ) : tier.remaining !== null && tier.remaining <= 10 ? (
                                  <span className="mt-1 block text-[12px] font-extrabold uppercase tracking-[0.1em]">
                                    Only {tier.remaining} left
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 text-[14.5px] font-extrabold [font-variant-numeric:tabular-nums]">
                                {tier.priceKobo === 0 ? "Free" : formatKobo(tier.priceKobo)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {maxQuantity > 1 && (
                      <div>
                        <p className={label}>How many</p>
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="One fewer"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="flex h-11 w-11 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[3ch] text-center text-[19px] font-extrabold [font-variant-numeric:tabular-nums]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="One more"
                            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                            disabled={quantity >= maxQuantity}
                            className="flex h-11 w-11 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          {quantity >= maxQuantity && (
                            <span className="text-[12.5px] text-[var(--dl-ink-soft)]">
                              {selectedTier?.remaining === maxQuantity
                                ? "That's all that's left"
                                : `Max ${maxQuantity} per order`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <MerchPicker products={products} basket={basket} onChange={setBasket} />

                <div>
                  <label htmlFor="name" className={label}>Your name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Chidi Okonkwo"
                    className={`${field} mt-2`}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={label}>WhatsApp number</label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0803 123 4567"
                    className={`${field} mt-2`}
                    required
                  />
                  {/* Read the number back. WhatsApp fails silently on a
                      malformed number, so the only safe moment to catch a
                      typo is before paying, while somebody is looking. */}
                  <p className="mt-1.5 text-[12px] text-[var(--dl-ink-soft)]">
                    {phoneE164
                      ? `Your ticket goes to ${formatE164(phoneE164)} on WhatsApp.`
                      : "Your ticket arrives here on WhatsApp, the moment you pay."}
                  </p>
                </div>
                <div>
                  <label htmlFor="email" className={label}>Email (backup copy)</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${field} mt-2`}
                    required
                  />
                </div>

                {(feeKobo > 0 || merchKobo > 0) && (
                  <div className={`${panel} space-y-1.5 px-4 py-3 text-[13.5px]`}>
                    <div className="flex justify-between text-[var(--dl-ink-soft)]">
                      <span>{quantity > 1 ? `${quantity} tickets` : "Ticket"}</span>
                      <span className="[font-variant-numeric:tabular-nums]">
                        {subtotalKobo === 0 ? "Free" : formatKobo(subtotalKobo)}
                      </span>
                    </div>

                    {products.map((product) => {
                      const picked = basket[product.id];
                      if (!picked) return null;
                      return (
                        <div key={product.id} className="flex justify-between text-[var(--dl-ink-soft)]">
                          <span className="truncate pr-3">
                            {picked.quantity > 1 ? `${picked.quantity} × ` : ""}
                            {product.name}
                            {picked.variant ? ` (${picked.variant})` : ""}
                          </span>
                          <span className="shrink-0 [font-variant-numeric:tabular-nums]">
                            {formatKobo(product.priceKobo * picked.quantity)}
                          </span>
                        </div>
                      );
                    })}

                    {feeKobo > 0 && (
                      <div className="flex justify-between text-[var(--dl-ink-soft)]">
                        <span>Booking fee</span>
                        <span className="[font-variant-numeric:tabular-nums]">{formatKobo(feeKobo)}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t-2 border-[var(--dl-line)] pt-1.5 font-extrabold">
                      <span>Total</span>
                      <span className="[font-variant-numeric:tabular-nums]">{formatKobo(totalKobo)}</span>
                    </div>
                  </div>
                )}

                {checkoutError && (
                  <p className="text-[13px] font-bold text-[var(--dl-danger)]">{checkoutError}</p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={isPending || nothingOnSale}
                  className="flex w-full items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] py-4 text-[15px] font-extrabold text-[var(--dl-paper)] transition-transform hover:-translate-y-[1px] disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing…
                    </>
                  ) : nothingOnSale ? (
                    "Sold out"
                  ) : !payingSomething ? (
                    quantity > 1 ? `Get ${quantity} tickets — free` : "Count me in — it's free"
                  ) : (
                    `Pay ${formatKobo(totalKobo)}`
                  )}
                </button>

                <p className="text-center text-[12.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                  {isFree
                    ? "No account needed. Your ticket arrives on WhatsApp, and by email as a backup."
                    : "No account needed. Card or bank transfer. Your ticket arrives on WhatsApp, and by email as a backup."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
