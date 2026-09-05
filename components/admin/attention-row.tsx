"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { setAttentionStatus } from "@/app/actions/admin";

const TONE: Record<string, string> = {
  critical: "border-[var(--dl-danger)] bg-[#FFF1F3] text-[var(--dl-danger)]",
  high: "border-[#8A5A00] bg-[#FFF3D6] text-[#8A5A00]",
  medium: "border-[var(--dl-line-soft)] text-[var(--dl-ink-soft)]",
  low: "border-[var(--dl-line-soft)] text-[var(--dl-ink-soft)]",
};

export function AttentionRow({ item, first }: { item: any; first: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const act = async (status: "investigating" | "resolved" | "ignored") => {
    setBusy(true);
    try {
      const res = await setAttentionStatus(item.id, status, note);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Updated, and logged.");
        setOpen(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.04em] disabled:opacity-40";

  // Where to go to actually look at the problem.
  const investigate = item.order_id
    ? `/admin/orders/${item.order_id}`
    : item.event_id
      ? `/admin/events/${item.event_id}`
      : item.creator_id
        ? `/admin/organisers/${item.creator_id}`
        : null;

  return (
    <div className={`px-5 py-4 ${first ? "" : "border-t-2 border-[var(--dl-line)]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-[2px] border-2 px-2 py-[2px] text-[10px] font-extrabold uppercase tracking-[0.08em] ${TONE[item.severity] ?? TONE.medium}`}>
              {item.severity}
            </span>
            <span className="font-mono text-[11.5px] text-[var(--dl-ink-faint)]">{item.kind}</span>
            {item.status !== "open" && (
              <span className="text-[11.5px] font-bold text-[var(--dl-ink-faint)]">{item.status}</span>
            )}
          </div>
          <p className="mt-1.5 text-[15px] font-extrabold tracking-[-0.02em]">{item.title}</p>
          {item.detail && (
            <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">{item.detail}</p>
          )}
          <p className="mt-1.5 text-[12px] text-[var(--dl-ink-faint)]">
            First seen {new Date(item.first_seen_at).toLocaleString("en-NG", {
              day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
            })}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {investigate && (
            <Link href={investigate as never} className={btn}>Investigate</Link>
          )}
          <button type="button" onClick={() => setOpen(!open)} className={btn}>
            {open ? "Close" : "Mark…"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-3.5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="What did you find? Optional, but it's what the next person reads."
            className="w-full rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-2 text-[13.5px] outline-none placeholder:text-[var(--dl-ink-faint)]"
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => act("investigating")} className={btn}>
              {busy && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}Looking at it
            </button>
            <button type="button" disabled={busy} onClick={() => act("resolved")} className={btn}>Resolved</button>
            <button type="button" disabled={busy} onClick={() => act("ignored")} className={btn}>Ignore</button>
          </div>
        </div>
      )}
    </div>
  );
}
