"use client";

import { useEffect, useState, useTransition } from "react";
import { getEventById, type PublicTicketType } from "@/app/actions/events";
import { createCheckoutSession } from "@/app/actions/checkout";
import { bandFeeKobo, formatKobo } from "@/lib/money";
import { Loader2, Calendar, MapPin, Users, ExternalLink, CheckCircle2, Minus, Plus } from "lucide-react";

export default function EventCheckoutPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<PublicTicketType[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
  const totalKobo = subtotalKobo + feeKobo;

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

  const handleCheckout = () => {
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
        ticketTypeId: selectedTierId ?? undefined,
        quantity,
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#0a0a0a] text-white">
        <p className="font-semibold">Event not found</p>
        <p className="text-sm text-zinc-500">This event may have been removed or unpublished.</p>
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
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl">
          <div className="relative h-44 w-full bg-zinc-800">
            {event.cover_image_url ? (
              <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <Calendar className="h-10 w-10 opacity-30" />
              </div>
            )}
          </div>

          <div className="p-7">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">{event.title}</h1>
              {event.description && (
                <p className="mt-2 text-sm text-zinc-400">{event.description}</p>
              )}
            </div>

            {/* The guest is trusting a person, not a platform — so say who. */}
            {hostName && (
              <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3">
                {host?.avatar_url ? (
                  <img src={host.avatar_url} alt={hostName} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {hostName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Hosted by</p>
                  {host?.handle ? (
                    <a href={`/${host.handle}`} className="text-sm font-semibold text-white hover:underline">
                      {hostName}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-white">{hostName}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3 rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-200">
                <Calendar className="h-4 w-4 shrink-0 text-zinc-500" />
                {formattedDate}
                {event.time ? ` • ${event.time}` : ""}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-200">
                <MapPin className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="truncate">{event.location || "Online"}</span>
                {event.map_link && (
                  <a
                    href={event.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-blue-400 hover:underline"
                  >
                    Map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-200">
                <Users className="h-4 w-4 shrink-0 text-zinc-500" />
                {event.attendees_count || 0} going
              </div>
            </div>

            {registered ? (
              <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-white">You&apos;re in</p>
                <p className="text-xs text-zinc-400">
                  We sent {quantity > 1 ? `${quantity} tickets` : "your ticket"} to {email}.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {nothingOnSale ? (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 text-center">
                    <p className="text-sm font-semibold text-white">
                      Nothing on sale right now
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
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
                        <label className="mb-1 block text-sm font-medium text-zinc-400">
                          Ticket
                        </label>
                        {ticketTypes.map((tier) => {
                          const selected = tier.id === selectedTierId;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              disabled={!tier.available}
                              onClick={() => setSelectedTierId(tier.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                                selected
                                  ? "border-blue-500 bg-blue-500/10"
                                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                              } ${tier.available ? "" : "cursor-not-allowed opacity-50"}`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-white">
                                  {tier.name}
                                </span>
                                {tier.description && (
                                  <span className="mt-0.5 block truncate text-xs text-zinc-400">
                                    {tier.description}
                                  </span>
                                )}
                                {tier.soldOut ? (
                                  <span className="mt-1 block text-xs font-semibold text-red-400">
                                    Sold out
                                  </span>
                                ) : tier.notYetOpen ? (
                                  <span className="mt-1 block text-xs text-zinc-500">
                                    Not on sale yet
                                  </span>
                                ) : tier.closed ? (
                                  <span className="mt-1 block text-xs text-zinc-500">
                                    Sales closed
                                  </span>
                                ) : tier.remaining !== null && tier.remaining <= 10 ? (
                                  <span className="mt-1 block text-xs font-semibold text-amber-400">
                                    Only {tier.remaining} left
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 text-sm font-bold text-white">
                                {tier.priceKobo === 0 ? "Free" : formatKobo(tier.priceKobo)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {maxQuantity > 1 && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-400">
                          How many
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="One fewer"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[3ch] text-center text-lg font-bold text-white">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="One more"
                            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                            disabled={quantity >= maxQuantity}
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          {quantity >= maxQuantity && (
                            <span className="text-xs text-zinc-500">
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

                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-400">
                    Your name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Chidi Okonkwo"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-400">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-blue-500"
                    required
                  />
                </div>

                {feeKobo > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-sm">
                    <div className="flex justify-between text-zinc-400">
                      <span>
                        {quantity > 1 ? `${quantity} tickets` : "Ticket"}
                      </span>
                      <span className="tabular-nums">{formatKobo(subtotalKobo)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Booking fee</span>
                      <span className="tabular-nums">{formatKobo(feeKobo)}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-700 pt-1.5 font-semibold text-white">
                      <span>Total</span>
                      <span className="tabular-nums">{formatKobo(totalKobo)}</span>
                    </div>
                  </div>
                )}

                {checkoutError && <p className="text-xs text-red-400">{checkoutError}</p>}

                <button
                  onClick={handleCheckout}
                  disabled={isPending || nothingOnSale}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-70"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                    </>
                  ) : nothingOnSale ? (
                    "Sold out"
                  ) : isFree ? (
                    quantity > 1 ? `Get ${quantity} tickets — free` : "Count me in — it's free"
                  ) : (
                    `Pay ${formatKobo(totalKobo)}`
                  )}
                </button>

                <p className="text-center text-xs text-zinc-500">
                  {isFree
                    ? "No account needed. Your tickets arrive by email."
                    : "No account needed. Card or bank transfer. Tickets arrive by email."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
