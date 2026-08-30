"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ImagePlus,
  Link2,
  Loader2,
  MapPin,
  Plus,
  Tag,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { bandFeeKobo, formatKobo, parseNairaInput } from "@/lib/money";
import { toast } from "sonner";

/**
 * Making an event.
 *
 * Shaped after the invite apps rather than the ticketing ones. A promoter
 * putting a night up is doing something closer to designing a flyer than
 * filling in a form, and the reference this follows treats it that way: the
 * title is the biggest thing on the page and typed straight in, the details
 * are short rows rather than labelled fields, and the artwork sits beside it
 * all, updating as you go.
 *
 * The version this replaces was a stack of grey cards with headings like
 * "Overview" and "Ticketing", a second sidebar inside the dashboard's own
 * sidebar, and blue links on zinc — none of which is the brand. It also
 * asked for the same event twice: once in the form, once in a preview card
 * that showed almost nothing.
 *
 * Everything it did, this still does. Only the shape changed.
 */
export default function CreateEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFree, setIsFree] = useState(false);
  const [passFeeToBuyer, setPassFeeToBuyer] = useState(false);

  /** Optional rows stay hidden until asked for, so the page opens short. */
  const [showMapLink, setShowMapLink] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    mapLink: "",
    description: "",
    price: "0",
    capacity: "",
  });

  // Shows the organiser the actual consequence of the switch, at the price
  // they have typed. An abstract explanation of a fee never lands; a number does.
  const previewPriceKobo = isFree ? 0 : parseNairaInput(formData.price) ?? 0;
  const previewFeeKobo = previewPriceKobo > 0 ? bandFeeKobo(previewPriceKobo) : 0;
  const feePreview =
    previewPriceKobo > 0
      ? {
          buyerPays: formatKobo(
            passFeeToBuyer ? previewPriceKobo + previewFeeKobo : previewPriceKobo
          ),
          youGet: formatKobo(
            passFeeToBuyer ? previewPriceKobo : previewPriceKobo - previewFeeKobo
          ),
        }
      : null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    if (!user) {
      toast.error("You need to be signed in.");
      return;
    }

    const priceKobo = isFree ? 0 : parseNairaInput(formData.price);
    if (priceKobo === null) {
      toast.error("Enter a valid ticket price.");
      return;
    }

    setIsSaving(true);

    try {
      let coverImageUrl: string | null = null;
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("event_covers")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("event_covers").getPublicUrl(filePath);

        coverImageUrl = publicUrl;
      }

      // Created as a DRAFT. Publishing is a separate, gated step — a paid
      // event can't go live until a bank account is connected.
      const { data: created, error: insertError } = await supabase
        .from("events")
        .insert({
          creator_id: user.id,
          title: formData.title,
          description: formData.description,
          date: formData.date || null,
          time: formData.time,
          location: formData.location,
          map_link: formData.mapLink,
          price_kobo: priceKobo,
          cover_image_url: coverImageUrl,
          status: "Upcoming",
          publish_status: "draft",
          pass_fee_to_buyer: passFeeToBuyer,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // An event sells ticket TYPES, not a bare price — with none it can't
      // sell anything at all. The price typed here becomes the first one,
      // and more can be added from the event's Tickets tab.
      const { error: tierError } = await supabase.from("ticket_types").insert({
        event_id: created.id,
        name: "General Admission",
        price_kobo: priceKobo,
        sort_order: 0,
        ...(formData.capacity.trim()
          ? { quantity: Number(formData.capacity.trim()) || null }
          : {}),
      });

      if (tierError) throw tierError;

      toast.success("Event saved as a draft.");
      router.push("/events");
      router.refresh();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the event. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const prettyDate = formData.date
    ? new Date(`${formData.date}T00:00:00`).toLocaleDateString("en-NG", {
        weekday: "short",
        day: "numeric",
        month: "long",
      })
    : null;

  /* A row: an icon, then whatever goes in it. No labels — the placeholder
     is the label, which is what keeps the page short enough to scan. */
  const row =
    "flex items-center gap-3.5 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3.5";
  const rowIcon = "h-[18px] w-[18px] shrink-0 text-[var(--dl-ink-faint)]";
  const rowInput =
    "w-full bg-transparent text-[15px] text-[var(--dl-ink)] placeholder-[var(--dl-ink-faint)] outline-none [color-scheme:light]";
  const addChip =
    "inline-flex items-center gap-1.5 rounded-[3px] border-2 border-[var(--dl-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--dl-ink-soft)] transition-colors hover:border-[var(--dl-line)] hover:text-[var(--dl-ink)]";

  return (
    <div className="relative">
      <form onSubmit={handleCreateEvent} className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-[13.5px] font-bold text-[var(--dl-ink-soft)] transition-colors hover:text-[var(--dl-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Events
          </Link>

          <span className="rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
            Draft
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          {/* ── The event itself ──────────────────────────────── */}
          <div className="min-w-0">
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Untitled event"
              aria-label="Event name"
              className="w-full bg-transparent text-[32px] font-extrabold leading-[1] tracking-[-0.04em] outline-none placeholder:text-[var(--dl-ink-faint)] sm:text-[40px]"
            />
            <p className="mt-3 text-[14.5px] text-[var(--dl-ink-soft)]">
              The name people see on the flyer, the ticket and the link they
              share.
            </p>

            <div className="mt-8 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={row}>
                  <CalendarDays className={rowIcon} />
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    aria-label="Date"
                    className={rowInput}
                  />
                </div>
                <div className={row}>
                  <Clock className={rowIcon} />
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    aria-label="Doors open"
                    className={rowInput}
                  />
                </div>
              </div>

              <div className={row}>
                <MapPin className={rowIcon} />
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Where is it?"
                  aria-label="Location"
                  className={rowInput}
                />
              </div>

              {showMapLink && (
                <div className={row}>
                  <Link2 className={rowIcon} />
                  <input
                    type="url"
                    value={formData.mapLink}
                    onChange={(e) => setFormData({ ...formData, mapLink: e.target.value })}
                    placeholder="Map or venue link"
                    aria-label="Map or venue link"
                    className={rowInput}
                  />
                </div>
              )}

              {showCapacity && (
                <div className={row}>
                  <Users className={rowIcon} />
                  <input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="How many can come in?"
                    aria-label="Capacity"
                    className={rowInput}
                  />
                </div>
              )}

              {(!showMapLink || !showCapacity) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {!showMapLink && (
                    <button type="button" onClick={() => setShowMapLink(true)} className={addChip}>
                      <Plus className="h-3.5 w-3.5" /> Map link
                    </button>
                  )}
                  {!showCapacity && (
                    <button type="button" onClick={() => setShowCapacity(true)} className={addChip}>
                      <Plus className="h-3.5 w-3.5" /> Capacity
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Price ──────────────────────────────────────── */}
            <div className="mt-8 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <Tag className={rowIcon} />
                  <span className="text-[15px] font-bold">Tickets</span>
                </div>

                <div className="flex items-center gap-2">
                  {(["Free", "Paid"] as const).map((option) => {
                    const active = (option === "Free") === isFree;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          const free = option === "Free";
                          setIsFree(free);
                          if (free) setFormData((d) => ({ ...d, price: "0" }));
                        }}
                        className={`rounded-[3px] border px-4 py-2 text-[13.5px] font-bold transition-colors ${
                          active
                            ? "border-[var(--dl-line)] bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                            : "border-[var(--dl-line)] text-[var(--dl-ink-soft)] hover:text-[var(--dl-ink)]"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isFree && (
                <>
                  <div className="mt-4 flex items-center gap-3.5 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3.5 ">
                    <span className="text-[15px] font-bold text-[var(--dl-ink-faint)]">₦</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0"
                      aria-label="Ticket price in naira"
                      className={rowInput}
                    />
                  </div>

                  <div className="mt-4 border-t border-[var(--dl-line)] pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-sm">
                        <p className="text-[14px] font-bold">Who pays our fee?</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
                          Add it on and you keep the full ticket price. Absorb it
                          and the buyer sees a round number.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPassFeeToBuyer(!passFeeToBuyer)}
                        className={`shrink-0 rounded-[3px] border px-4 py-2 text-[13.5px] font-bold transition-colors ${
                          passFeeToBuyer
                            ? "border-[var(--dl-line)] bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                            : "border-[var(--dl-line)] text-[var(--dl-ink-soft)] hover:text-[var(--dl-ink)]"
                        }`}
                      >
                        {passFeeToBuyer ? "Buyer pays it" : "I'll absorb it"}
                      </button>
                    </div>

                    {feePreview && (
                      <p className="mt-3 text-[13px] text-[var(--dl-ink-soft)]">
                        Buyer pays{" "}
                        <span className="font-bold text-[var(--dl-ink)]">
                          {feePreview.buyerPays}
                        </span>
                        {" · "}you receive{" "}
                        <span className="font-bold text-[var(--mint)]">
                          {feePreview.youGet}
                        </span>
                        <span className="text-[var(--dl-ink-faint)]">
                          {" "}
                          (before your bank&apos;s card charges)
                        </span>
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Description ────────────────────────────────── */}
            <div className="mt-8">
              <textarea
                rows={5}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What should people know? Line-up, dress code, what time it really starts."
                aria-label="Description"
                className="w-full resize-none rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-4 text-[15px] leading-relaxed text-[var(--dl-ink)] outline-none transition-colors placeholder:text-[var(--dl-ink-faint)] focus:border-[var(--dl-line)]"
              />
            </div>
          </div>

          {/* ── The flyer, and what it will look like ─────────── */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleImageDrop}
              onDragOver={(e) => e.preventDefault()}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] text-left transition-colors hover:border-[var(--dl-line)]"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <ImagePlus className="h-8 w-8 text-[var(--dl-ink-faint)]" />
                  <span className="text-[14px] font-bold text-[var(--dl-ink-soft)]">
                    Add your flyer
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-[var(--dl-ink-faint)]">
                    This is the picture people see when your link lands in a
                    group chat.
                  </span>
                </span>
              )}

              {imagePreview && (
                <span className="absolute bottom-3 right-3 rounded-[3px] bg-[var(--ink)] px-4 py-2 text-[12.5px] font-bold text-[var(--paper)] opacity-0 transition-opacity group-hover:opacity-100">
                  Change
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="mt-5 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
                Shared as
              </p>
              <p className="mt-2 text-[15px] font-extrabold leading-snug">
                {formData.title || "Untitled event"}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
                {[
                  prettyDate,
                  formData.time,
                  formData.location,
                  isFree
                    ? "Free entry"
                    : previewPriceKobo > 0
                      ? `Tickets from ${formatKobo(previewPriceKobo)}`
                      : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Fill it in and this fills in with it."}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex flex-1 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-6 py-3.5 text-[15px] font-extrabold text-[var(--dl-paper)] transition-transform hover:-translate-y-[1px] disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save draft"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => router.push("/events")}
                className="rounded-[3px] px-4 py-3.5 text-[14px] font-bold text-[var(--dl-ink-soft)] transition-colors hover:text-[var(--dl-ink)]"
              >
                Discard
              </button>
            </div>

            <p className="mt-3 text-center text-[12.5px] leading-relaxed text-[var(--dl-ink-faint)]">
              Saved as a draft. Nothing is live until you publish it.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
