"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Gift, Loader2, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import {
  applyCreditToEvent,
  getReferPageData,
  removeCreditFromEvent,
  type ReferPageData,
} from "@/app/actions/referrals";

/**
 * Refer another organiser.
 *
 * The offer is deliberately symmetrical — you both get a free event —
 * because that is what makes it something an organiser will actually send
 * to somebody, rather than an affiliate scheme they'd be embarrassed to
 * pass on.
 *
 * The wait is stated plainly at the top rather than buried: a credit
 * arrives when the person you invited sells their first ticket, not when
 * they sign up. Discovering that rule later, from a missing credit, is
 * how a growth offer turns into a support message.
 */
export default function ReferPage() {
  const [data, setData] = useState<ReferPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyEvent, setBusyEvent] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await getReferPageData();
    if (res.ok) setData(res.data);
    else setLoadError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = async () => {
    if (!data?.summary.link) return;
    try {
      await navigator.clipboard.writeText(data.summary.link);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // A clipboard write can be refused outright — an insecure origin, or
      // a browser that wants a gesture it didn't see. Say so, because the
      // link is right there on screen to select by hand.
      toast.error("Couldn't copy it. Select the link and copy it yourself.");
    }
  };

  const apply = async (eventId: string) => {
    setBusyEvent(eventId);
    const res = await applyCreditToEvent(eventId);
    if (res.success) {
      toast.success("Done — no fees on that event.");
      await load();
    } else {
      toast.error(res.error);
    }
    setBusyEvent(null);
  };

  const remove = async (eventId: string) => {
    setBusyEvent(eventId);
    const res = await removeCreditFromEvent(eventId);
    if (res.success) {
      toast.success("Moved back. Use it on another event.");
      await load();
    } else {
      toast.error(res.error);
    }
    setBusyEvent(null);
  };

  const panel = "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";
  const label =
    "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className={`${panel} p-6`}>
        <p className="text-[15px] text-[var(--dl-ink-soft)]">
          {loadError ?? "Could not load this page."}
        </p>
        <button
          onClick={() => void load()}
          className="mt-4 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em]"
        >
          Try again
        </button>
      </div>
    );
  }

  const { summary, events } = data;
  const waived = events.filter((e) => e.feeWaived);
  const usable = events.filter((e) => !e.feeWaived);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">
          Bring another organiser,{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic tracking-[-0.01em]">
            you both go free.
          </span>
        </h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[var(--dl-ink-soft)]">
          Send your link to someone who runs events. When they sell their
          first ticket, you each get one event with no Paylance fee on it at
          all &mdash; however many tickets it sells.
        </p>
      </div>

      {/* The link. The single thing this page exists to hand over. */}
      <div className={`${panel} p-5 sm:p-6`}>
        <p className={label}>Your link</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-paper)] px-4 py-3 font-mono text-[14px] font-semibold">
            {summary.link ?? "—"}
          </code>
          <button
            onClick={() => void copyLink()}
            disabled={!summary.link}
            className="flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)] disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-[13px] text-[var(--dl-ink-soft)]">
          Anyone who signs up after opening it is counted as yours, for the
          next 90 days.
        </p>
      </div>

      {/* Where they've got to. */}
      <div className={`${panel} flex flex-wrap`}>
        <Figure
          icon={<Users className="h-4 w-4" />}
          n={String(summary.earned)}
          l="Brought in"
          x="signed up and sold a ticket"
        />
        <Figure
          icon={<Ticket className="h-4 w-4" />}
          n={String(summary.pending)}
          l="Signed up"
          x="not sold anything yet"
        />
        <Figure
          icon={<Gift className="h-4 w-4" />}
          n={String(summary.availableCount)}
          l="Free events"
          x="waiting to be used"
        />
      </div>

      {/* Spending a credit. */}
      <div>
        <p className={label}>Use a free event</p>

        {summary.availableCount === 0 && waived.length === 0 ? (
          <div className={`${panel} mt-3 p-6`}>
            <p className="text-[15px] leading-relaxed text-[var(--dl-ink-soft)]">
              Nothing to use yet. Send your link to someone who runs events
              &mdash; when they sell their first ticket, a free event lands
              here for both of you.
            </p>
          </div>
        ) : (
          <div className={`${panel} mt-3`}>
            {waived.map((e) => (
              <EventRow
                key={e.id}
                title={e.title}
                date={e.date}
                note={
                  e.hasSales
                    ? "No fee on this event. It has started selling, so it's now used."
                    : "No fee on this event."
                }
                action={
                  e.hasSales ? null : (
                    <button
                      onClick={() => void remove(e.id)}
                      disabled={busyEvent === e.id}
                      className="shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.04em] disabled:opacity-50"
                    >
                      {busyEvent === e.id ? "…" : "Move it"}
                    </button>
                  )
                }
                on
              />
            ))}

            {summary.availableCount > 0 &&
              usable.map((e) => (
                <EventRow
                  key={e.id}
                  title={e.title}
                  date={e.date}
                  note={null}
                  action={
                    <button
                      onClick={() => void apply(e.id)}
                      disabled={busyEvent === e.id}
                      className="shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)] disabled:opacity-50"
                    >
                      {busyEvent === e.id ? "…" : "Use it here"}
                    </button>
                  }
                />
              ))}

            {summary.availableCount > 0 && usable.length === 0 && (
              <p className="px-5 py-4 text-[14px] text-[var(--dl-ink-soft)]">
                You have a free event to spend, but nothing to spend it on
                yet. It applies to an event that charges for tickets and
                hasn&rsquo;t happened yet.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Figure({
  icon,
  n,
  l,
  x,
}: {
  icon: React.ReactNode;
  n: string;
  l: string;
  x: string;
}) {
  return (
    <div className="min-w-[150px] flex-1 border-l-2 border-[var(--dl-line)] px-5 py-4 first:border-l-0">
      <span className="text-[var(--dl-ink-faint)]">{icon}</span>
      <p className="mt-2 text-[26px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
        {n}
      </p>
      <p className="mt-1 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
        {l}
      </p>
      <p className="mt-1 text-[12px] text-[var(--dl-ink-soft)]">{x}</p>
    </div>
  );
}

function EventRow({
  title,
  date,
  note,
  action,
  on,
}: {
  title: string;
  date: string | null;
  note: string | null;
  action: React.ReactNode;
  on?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t-2 border-[var(--dl-line)] px-5 py-4 first:border-t-0">
      <div className="min-w-[180px] flex-1">
        <p className="text-[15px] font-bold">
          {title}
          {on && (
            <span className="ml-2 rounded-[2px] bg-[var(--mint)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">
              Free
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[13px] text-[var(--dl-ink-soft)]">
          {date
            ? new Date(date).toLocaleDateString("en-NG", {
                weekday: "short",
                day: "numeric",
                month: "long",
              })
            : "No date set"}
          {note ? ` · ${note}` : ""}
        </p>
      </div>
      {action}
    </div>
  );
}
