"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Changing the standing of an event or an organiser.
 *
 * A REASON IS COMPULSORY FOR ANYTHING BUT "OK". It goes into the audit
 * log, and a log full of "suspended" with no why is a log that answers
 * nothing three months later when somebody asks.
 *
 * The dangerous options are behind a second press that names the
 * consequence. Suspending an organiser mid-event pulls every one of their
 * live events off sale, and nobody should discover that after the fact.
 */
export function StateControl({
  current,
  options,
  consequence,
  onApply,
}: {
  current: string;
  options: { value: string; label: string; danger?: boolean }[];
  /** Shown on the confirm step for the selected option, when it has one. */
  consequence?: Record<string, string>;
  onApply: (state: string, reason: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const chosen = options.find((o) => o.value === choice);
  const needsReason = choice !== null && choice !== "ok";

  const apply = async () => {
    if (!choice) return;
    setBusy(true);
    try {
      const res = await onApply(choice, reason);
      if (!res.success) {
        toast.error(res.error ?? "That didn't work.");
        return;
      }
      toast.success("Done, and written to the activity log.");
      setChoice(null);
      setReason("");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={o.value === current}
            onClick={() => {
              setChoice(o.value === choice ? null : o.value);
              setReason("");
            }}
            className={`rounded-[3px] border-2 px-3.5 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-[1px] disabled:opacity-35 disabled:hover:translate-y-0 ${
              choice === o.value
                ? "border-[var(--dl-line)] bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                : o.danger
                  ? "border-[var(--dl-danger)] text-[var(--dl-danger)]"
                  : "border-[var(--dl-line)]"
            }`}
          >
            {o.value === current ? `${o.label} (now)` : o.label}
          </button>
        ))}
      </div>

      {choice && (
        <div
          className={`mt-4 rounded-[3px] border-2 p-4 ${
            chosen?.danger
              ? "border-[var(--dl-danger)] bg-[#FFF1F3]"
              : "border-[var(--dl-line)] bg-[var(--dl-panel)]"
          }`}
        >
          <div className="flex items-start gap-3">
            {chosen?.danger && (
              <AlertTriangle
                className="mt-[2px] h-[18px] w-[18px] shrink-0 text-[var(--dl-danger)]"
                strokeWidth={2.5}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-extrabold">
                Set to {chosen?.label.toLowerCase()}
              </p>
              {consequence?.[choice] && (
                <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                  {consequence[choice]}
                </p>
              )}

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder={needsReason ? "Why? This goes in the log." : "Reason (optional)"}
                className="mt-3 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 py-2.5 text-[14px] outline-none placeholder:text-[var(--dl-ink-faint)]"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={apply}
                  disabled={busy || pending || (needsReason && !reason.trim())}
                  className="flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)] disabled:opacity-40"
                >
                  {(busy || pending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setChoice(null)}
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
