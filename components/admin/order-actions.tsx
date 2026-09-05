"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, Flag } from "lucide-react";
import { resendTickets, flagOrder } from "@/app/actions/admin";

/**
 * The two things support does most.
 *
 * Resending needs no confirm step: it reissues nothing, it only tells
 * somebody about tickets they already have, so the worst case is a
 * duplicate email. Flagging asks for a note, because a flag with no
 * reason is noise in somebody else's queue.
 */
export function OrderActions({ orderId, canResend }: { orderId: string; canResend: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"resend" | "flag" | null>(null);
  const [flagging, setFlagging] = useState(false);
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();

  const btn =
    "flex w-full items-center justify-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-[1px] disabled:opacity-40";

  const resend = async () => {
    setBusy("resend");
    try {
      const res = await resendTickets(orderId);
      if (!res.success) toast.error(res.error);
      else toast.success(`Sent ${res.count} ${res.count === 1 ? "ticket" : "tickets"} again.`);
    } finally {
      setBusy(null);
    }
  };

  const flag = async () => {
    setBusy("flag");
    try {
      const res = await flagOrder(orderId, note);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Flagged. It's in Needs attention now.");
        setFlagging(false);
        setNote("");
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {canResend && (
        <button type="button" onClick={resend} disabled={busy !== null} className={btn}>
          {busy === "resend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={2.5} />}
          Resend tickets
        </button>
      )}

      {!flagging ? (
        <button type="button" onClick={() => setFlagging(true)} disabled={busy !== null} className={btn}>
          <Flag className="h-3.5 w-3.5" strokeWidth={2.5} />
          Flag for review
        </button>
      ) : (
        <div className="rounded-[3px] border-2 border-[var(--dl-line)] p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="What looks wrong?"
            className="w-full rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-2 text-[13.5px] outline-none placeholder:text-[var(--dl-ink-faint)]"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={flag} disabled={busy !== null || !note.trim()} className={btn}>
              {busy === "flag" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Flag it
            </button>
            <button type="button" onClick={() => setFlagging(false)} className={btn}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
