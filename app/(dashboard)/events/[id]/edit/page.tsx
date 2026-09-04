"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2, CalendarDays, Clock, MapPin, Link2, ArrowLeft, ImagePlus, AlertTriangle, Ticket, Megaphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { getEventForEdit, updateEvent } from "@/app/actions/event-edit";
import { TitleStylePicker } from "@/components/dashboard/title-style-picker";
import { CohostEditor, type CohostDraft } from "@/components/dashboard/cohost-editor";
import {
  DEFAULT_TITLE_STYLE, titleStyleCssClamp, type TitleStyleId,
} from "@/lib/title-styles";

/**
 * Changing an event after it exists.
 *
 * THE WARNING IS THE POINT OF THIS SCREEN. Editing a draft is harmless.
 * Editing an event that people have already bought tickets to is a
 * different act entirely: move the date or the venue and every existing
 * ticket-holder paid for something that is no longer happening. That is
 * both the decent-behaviour problem and, as Paystack spelled out, the
 * exact shape of a chargeback — "value was not provided".
 *
 * So the screen counts the tickets already issued before the organiser
 * types anything, and says plainly what changing the date now means. It
 * does not block the edit: events genuinely do move, and an organiser who
 * cannot correct a venue is worse off than one who can.
 *
 * PRICE IS NOT HERE. Tickets are sold from ticket_types, and the price on
 * the event row is read only by the publish gate. Editing it here would
 * move the gate without moving a single ticket price, so this links to
 * the Tickets editor instead of pretending otherwise.
 */
export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [titleStyle, setTitleStyle] = useState<TitleStyleId>(DEFAULT_TITLE_STYLE);
  const [cohosts, setCohosts] = useState<CohostDraft[]>([]);
  const [ticketsIssued, setTicketsIssued] = useState(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", hostNickname: "", date: "", time: "",
    location: "", mapLink: "", description: "",
  });

  // What the date and venue were when the page loaded, so the warning can
  // fire on an actual change rather than on merely opening the screen.
  const [original, setOriginal] = useState({ date: "", time: "", location: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getEventForEdit(params.id);
    if (!res.ok) {
      setLoadError(res.error);
      setLoading(false);
      return;
    }
    const e = res.event as any;
    setForm({
      title: e.title ?? "",
      hostNickname: e.host_nickname ?? "",
      date: e.date ?? "",
      time: e.time ?? "",
      location: e.location ?? "",
      mapLink: e.map_link ?? "",
      description: e.description ?? "",
    });
    setOriginal({ date: e.date ?? "", time: e.time ?? "", location: e.location ?? "" });
    setTitleStyle((e.title_style ?? DEFAULT_TITLE_STYLE) as TitleStyleId);
    setCohosts(res.cohosts);
    setTicketsIssued(res.ticketsIssued);
    setCoverUrl(e.cover_image_url ?? null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const movedTheEvent =
    ticketsIssued > 0 &&
    (form.date !== original.date ||
      form.time !== original.time ||
      form.location !== original.location);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("An event needs a name.");
      return;
    }
    setSaving(true);
    try {
      // The image goes up from the browser, exactly as it does on create,
      // so a big file never travels through a server action.
      let newCover: string | undefined;
      if (coverFile && user) {
        const supabase = createClient();
        const ext = coverFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("event_covers")
          .upload(path, coverFile);
        if (upErr) throw upErr;
        newCover = supabase.storage.from("event_covers").getPublicUrl(path).data.publicUrl;
      }

      const res = await updateEvent({
        id: params.id,
        title: form.title,
        titleStyle,
        hostNickname: form.hostNickname,
        date: form.date,
        time: form.time,
        location: form.location,
        mapLink: form.mapLink,
        description: form.description,
        coverImageUrl: newCover,
        cohosts,
      });

      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.cohostsSaved ? "Changes saved." : "Saved, but the cohosts didn't. Try those again."
      );
      router.push("/events");
      router.refresh();
    } catch (err) {
      console.error("Could not save the event", err);
      toast.error("Could not save those changes.");
    } finally {
      setSaving(false);
    }
  };

  const row =
    "flex items-center gap-3.5 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3.5";
  const rowIcon = "h-[18px] w-[18px] shrink-0 text-[var(--dl-ink-faint)]";
  const rowInput =
    "w-full bg-transparent text-[15px] text-[var(--dl-ink)] placeholder-[var(--dl-ink-faint)] outline-none [color-scheme:light]";
  const sectionLabel =
    "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";

  if (loading) {
    return (
      <section className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] py-14 text-center">
        <p className="text-[15px] font-semibold">{loadError}</p>
        <Link
          href="/events"
          className="mt-4 inline-block rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[13px] font-extrabold"
        >
          Back to your events
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <Link
        href="/events"
        className="mb-8 inline-flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.04em]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Your events
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="min-w-0">
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Untitled event"
            aria-label="Event name"
            style={titleStyleCssClamp(titleStyle, 32, 40)}
            className="w-full bg-transparent text-[var(--dl-ink)] outline-none placeholder:text-[var(--dl-ink-faint)]"
          />
          <p className="mt-3 text-[14.5px] text-[var(--dl-ink-soft)]">
            The name people see on the flyer, the ticket and the link they share.
          </p>

          <div className="mt-5">
            <TitleStylePicker value={titleStyle} onChange={setTitleStyle} />
          </div>

          {/* The one thing on this page that can hurt somebody. */}
          {movedTheEvent && (
            <div className="mt-7 rounded-[3px] border-2 border-[var(--dl-danger)] bg-[#FFF1F3] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-[2px] h-[18px] w-[18px] shrink-0 text-[var(--dl-danger)]"
                  strokeWidth={2.5}
                />
                <div>
                  <p className="text-[14.5px] font-extrabold">
                    {ticketsIssued} {ticketsIssued === 1 ? "person has" : "people have"} a
                    ticket to this
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                    You&apos;re changing when or where it happens, so they bought a ticket
                    to something different.{" "}
                    <strong className="font-bold text-[var(--dl-ink)]">
                      Save this first, then tell them
                    </strong>{" "}
                    &mdash; guests who turn up to the wrong place ask their bank for the
                    money back, and that comes out of you.
                  </p>
                  <Link
                    href={`/events/${params.id}/message`}
                    className="mt-3 inline-flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3.5 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em]"
                  >
                    <Megaphone className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Message the {ticketsIssued}
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={row}>
                <CalendarDays className={rowIcon} />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  aria-label="Date"
                  className={rowInput}
                />
              </div>
              <div className={row}>
                <Clock className={rowIcon} />
                <input
                  type="text"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  placeholder="8:00 PM"
                  aria-label="Start time"
                  className={rowInput}
                />
              </div>
            </div>

            <div className={row}>
              <MapPin className={rowIcon} />
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Where it happens"
                aria-label="Location"
                className={rowInput}
              />
            </div>

            <div className={row}>
              <Link2 className={rowIcon} />
              <input
                type="url"
                value={form.mapLink}
                onChange={(e) => setForm({ ...form, mapLink: e.target.value })}
                placeholder="Google Maps link (optional)"
                aria-label="Map link"
                className={rowInput}
              />
            </div>

            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What should people know before they come?"
              aria-label="Description"
              rows={5}
              className="w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-[var(--dl-ink-faint)]"
            />
          </div>

          <div className="mt-9">
            <p className={sectionLabel}>Hosted by</p>
            <input
              type="text"
              value={form.hostNickname}
              onChange={(e) => setForm({ ...form, hostNickname: e.target.value })}
              placeholder="Your name, or what you throw parties as"
              maxLength={60}
              aria-label="Host name shown on the flyer"
              className="mt-2.5 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3.5 py-2.5 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--dl-ink)]"
            />
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
              Optional. Leave it empty and we use your own name. This changes the flyer
              only &mdash; your money still goes to your verified bank account either way.
            </p>
            <div className="mt-4">
              <CohostEditor cohosts={cohosts} onChange={setCohosts} />
            </div>
          </div>
        </div>

        {/* ── Cover, tickets, save ─────────────────────────── */}
        <div className="flex flex-col gap-5">
          <div>
            <p className={sectionLabel}>Cover image</p>
            <label className="mt-2.5 block cursor-pointer overflow-hidden rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setCoverFile(f);
                    setCoverPreview(URL.createObjectURL(f));
                  }
                }}
              />
              {coverPreview || coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview ?? coverUrl ?? ""}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <span className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-[var(--dl-ink-faint)]">
                  <ImagePlus className="h-6 w-6" strokeWidth={2} />
                  <span className="text-[13px] font-bold">Add a cover</span>
                </span>
              )}
            </label>
            <p className="mt-2 text-[12.5px] text-[var(--dl-ink-soft)]">
              Tap it to choose a different one.
            </p>
          </div>

          {/* Prices live with the tickets, so say so rather than putting a
              price box here that wouldn't change what anyone is charged. */}
          <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-4">
            <div className="flex items-start gap-3">
              <Ticket className={rowIcon} />
              <div>
                <p className="text-[14px] font-extrabold">Prices and capacity</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
                  Those live with your ticket types, not here. Open the event from your
                  events list and use the Tickets tab.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-acid)] px-5 py-3.5 text-[13px] font-extrabold uppercase tracking-[0.06em] transition-transform hover:-translate-y-[1px] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
