"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Send, AlertTriangle, Mail, MessageCircle, Check } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { getGuestAudience, notifyGuests, type GuestAudience } from "@/app/actions/notify";

/**
 * Message everyone holding a ticket.
 *
 * TWO STEPS, ALWAYS. Writing and sending are separate presses. This is the
 * one screen in the product that does something to hundreds of other
 * people's phones and cannot be undone, so the second press states the
 * number out loud before it happens. Nothing here is clever; it is
 * deliberately hard to do by accident.
 *
 * The screen never receives a single guest's address. It is told how many
 * people can be reached on each channel and nothing else — a browser has
 * no business holding a few hundred phone numbers.
 */
export default function MessageGuestsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();

  const [audience, setAudience] = useState<GuestAudience | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSummary, setSentSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getGuestAudience(params.id);
    if (!("ok" in res) || !res.ok) {
      setLoadError((res as any).error ?? "Could not load this.");
    } else {
      setAudience(res);
      setLoadError(null);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const send = async () => {
    setSending(true);
    try {
      const res = await notifyGuests(params.id, body);
      if (!res.success) {
        toast.error(res.error);
        setConfirming(false);
        return;
      }
      const bits = [`${res.emailSent} by email`];
      if (res.whatsappSkipped) bits.push("WhatsApp not set up yet");
      else bits.push(`${res.whatsappSent} on WhatsApp`);
      setSentSummary(`Sent to ${res.guests} ${res.guests === 1 ? "guest" : "guests"} — ${bits.join(", ")}.`);
      setBody("");
      setConfirming(false);
      await load();
    } finally {
      setSending(false);
    }
  };

  const label =
    "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";
  const panel =
    "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";

  if (loading) {
    return (
      <section className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
      </section>
    );
  }

  if (loadError || !audience) {
    return (
      <section className={`${panel} py-14 text-center`}>
        <p className="text-[15px] font-semibold">{loadError}</p>
        <Link href="/events" className="mt-4 inline-block rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[13px] font-extrabold">
          Back to your events
        </Link>
      </section>
    );
  }

  const blocked = audience.waitSeconds !== null;

  return (
    <section>
      <Link href="/events" className="mb-8 inline-flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.04em]">
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Your events
      </Link>

      <h1 className="text-[34px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[42px]">
        Message your{" "}
        <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
          guests.
        </span>
      </h1>
      <p className="mt-3 max-w-[52ch] text-[15px] text-[var(--dl-ink-soft)]">
        Everyone holding a ticket to <strong>{audience.eventTitle}</strong>. Use it when
        something changes — a new time, a new venue, or the event being called off.
      </p>

      {audience.guests === 0 ? (
        <div className={`${panel} mt-8 px-6 py-14 text-center`}>
          <p className="text-[16px] font-extrabold tracking-[-0.02em]">Nobody has a ticket yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
            Once somebody buys, you&apos;ll be able to reach them from here.
          </p>
        </div>
      ) : (
        <>
          <div className={`${panel} mt-8 flex flex-wrap`}>
            <div className="min-w-[150px] flex-1 px-5 py-4">
              <p className="text-[27px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
                {audience.guests}
              </p>
              <p className={`${label} mt-1`}>Guests</p>
            </div>
            <div className="min-w-[150px] flex-1 border-l-2 border-[var(--dl-line)] px-5 py-4">
              <p className="flex items-center gap-2 text-[27px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
                <Mail className="h-4 w-4 text-[var(--dl-ink-faint)]" strokeWidth={2.5} />
                {audience.reachableByEmail}
              </p>
              <p className={`${label} mt-1`}>By email</p>
            </div>
            <div className="min-w-[150px] flex-1 border-l-2 border-[var(--dl-line)] px-5 py-4">
              <p className="flex items-center gap-2 text-[27px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
                <MessageCircle className="h-4 w-4 text-[var(--dl-ink-faint)]" strokeWidth={2.5} />
                {audience.whatsappConfigured ? audience.reachableByWhatsApp : 0}
              </p>
              <p className={`${label} mt-1`}>On WhatsApp</p>
            </div>
          </div>

          {!audience.whatsappConfigured && audience.reachableByWhatsApp > 0 && (
            <div className="mt-3 rounded-[3px] border-2 border-[#8A5A00] bg-[#FFF3D6] px-4 py-3">
              <p className="text-[13.5px] leading-relaxed">
                <strong>{audience.reachableByWhatsApp}</strong> of them gave a WhatsApp
                number, but WhatsApp can&apos;t carry this yet — Meta has to approve a
                message format first. Email goes out normally in the meantime.
              </p>
            </div>
          )}

          {sentSummary && (
            <div className="mt-6 flex items-start gap-3 rounded-[3px] border-2 border-[var(--mint)] bg-[#E4F5EC] px-4 py-3.5">
              <Check className="mt-[2px] h-[18px] w-[18px] shrink-0 text-[var(--mint)]" strokeWidth={3} />
              <p className="text-[14px] font-semibold">{sentSummary}</p>
            </div>
          )}

          <div className="mt-8">
            <p className={label}>What do you want to tell them?</p>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setConfirming(false);
              }}
              rows={7}
              maxLength={2000}
              placeholder={`The venue has changed. We're now at Landmark Beach instead of Hard Rock — same date, same time. Your ticket still works, just come to the new place.`}
              className="mt-2.5 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-[var(--dl-ink-faint)]"
            />
            <p className="mt-1.5 text-[12.5px] text-[var(--dl-ink-soft)]">
              {body.length}/2000. Their ticket stays valid — the message says so at the bottom.
            </p>
          </div>

          {blocked && (
            <p className="mt-4 text-[13.5px] font-semibold text-[var(--dl-ink-soft)]">
              You sent one a few minutes ago. You can send another in about{" "}
              {Math.ceil((audience.waitSeconds ?? 0) / 60)} minutes.
            </p>
          )}

          {!confirming ? (
            <button
              type="button"
              disabled={!body.trim() || blocked}
              onClick={() => setConfirming(true)}
              className="mt-6 flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-5 py-3.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-[var(--dl-paper)] transition-transform hover:-translate-y-[1px] disabled:opacity-40"
            >
              <Send className="h-4 w-4" strokeWidth={2.5} />
              Review and send
            </button>
          ) : (
            <div className="mt-6 rounded-[3px] border-2 border-[var(--dl-danger)] bg-[#FFF1F3] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-[2px] h-[18px] w-[18px] shrink-0 text-[var(--dl-danger)]" strokeWidth={2.5} />
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold">
                    This goes to {audience.guests}{" "}
                    {audience.guests === 1 ? "person" : "people"} right now
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                    It can&apos;t be unsent or edited afterwards. Read it once more.
                  </p>
                  <div className="mt-3.5 whitespace-pre-wrap rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3 text-[14px] leading-relaxed">
                    {body}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={send}
                      disabled={sending}
                      className="flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-5 py-3 text-[13px] font-extrabold uppercase tracking-[0.06em] text-[var(--dl-paper)] disabled:opacity-60"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
                      {sending ? "Sending" : `Send to ${audience.guests}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      disabled={sending}
                      className="rounded-[3px] border-2 border-[var(--dl-line)] px-5 py-3 text-[13px] font-extrabold uppercase tracking-[0.06em]"
                    >
                      Go back
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {audience.recent.length > 0 && (
            <div className="mt-12">
              <p className={label}>Already sent</p>
              <div className={`${panel} mt-3`}>
                {audience.recent.map((r, i) => (
                  <div key={i} className={`px-5 py-4 ${i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""}`}>
                    <p className="text-[12px] font-bold text-[var(--dl-ink-faint)]">
                      {new Date(r.created_at).toLocaleString("en-NG", {
                        day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                      })}
                      {" · "}
                      {r.recipients_total} {r.recipients_total === 1 ? "guest" : "guests"}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed">{r.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 max-w-[58ch] text-[12.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                Keep this. If a guest ever disputes a payment because an event moved, the
                record that you told them, and when, is what settles it.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
