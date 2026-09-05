"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { refundOrder } from "@/app/actions/admin";
import { formatKobo, parseNairaInput } from "@/lib/money";

/**
 * Sending a buyer their money back.
 *
 * TWO PRESSES, AND THE SECOND ONE SAYS THE NUMBER. This moves real money
 * out of the platform and cannot be undone by clicking again. The confirm
 * step states the amount in naira and who it goes to.
 *
 * The amount defaults to the full refundable balance because that is what
 * is wanted almost every time, but partial refunds are allowed — a
 * cancelled support act is not a cancelled event.
 */
export function RefundBox({
  orderId,
  refundableKobo,
  buyer,
}: {
  orderId: string;
  refundableKobo: number;
  buyer: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState((refundableKobo / 100).toLocaleString("en-NG"));
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const parsed = parseNairaInput(amount);
  const valid = parsed !== null && parsed > 0 && parsed <= refundableKobo;

  if (refundableKobo <= 0) {
    return (
      <p className="text-[14px] text-[var(--dl-ink-soft)]">
        Nothing left to refund on this order.
      </p>
    );
  }

  const send = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const res = await refundOrder(orderId, parsed!, reason);
      if (!res.success) {
        toast.error(res.error);
        setConfirming(false);
        return;
      }
      toast.success(
        res.status === "refunded"
          ? "Refunded, and written to the activity log."
          : "Refund accepted by the bank — it settles shortly."
      );
      setConfirming(false);
      setReason("");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-[var(--dl-ink-faint)]";

  return (
    <div>
      <p className="text-[13px] text-[var(--dl-ink-soft)]">
        Up to <strong className="text-[var(--dl-ink)]">{formatKobo(refundableKobo)}</strong> can
        still go back.
      </p>

      <div className="relative mt-3">
        <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[var(--dl-ink-faint)]">₦</span>
        <input
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setConfirming(false); }}
          inputMode="numeric"
          aria-label="Refund amount in naira"
          className={`${field} pl-8`}
        />
      </div>
      {parsed !== null && parsed > refundableKobo && (
        <p className="mt-1.5 text-[12.5px] font-semibold text-[var(--dl-danger)]">
          That&apos;s more than is left on this order.
        </p>
      )}

      <textarea
        value={reason}
        onChange={(e) => { setReason(e.target.value); setConfirming(false); }}
        rows={2}
        placeholder="Why? This goes in the log."
        className={`${field} mt-2.5`}
      />

      {!confirming ? (
        <button
          type="button"
          disabled={!valid || !reason.trim()}
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] disabled:opacity-40"
        >
          Refund…
        </button>
      ) : (
        <div className="mt-3 rounded-[3px] border-2 border-[var(--dl-danger)] bg-[#FFF1F3] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-[2px] h-[18px] w-[18px] shrink-0 text-[var(--dl-danger)]" strokeWidth={2.5} />
            <div className="min-w-0">
              <p className="text-[14.5px] font-extrabold">
                Send {formatKobo(parsed!)} back to {buyer}?
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                This moves real money and cannot be undone from here.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={send}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)] disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Yes, refund
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
