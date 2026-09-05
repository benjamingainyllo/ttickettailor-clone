"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleInterest } from "@/app/actions/interest";

/**
 * "I might go to this."
 *
 * OPTIMISTIC, BECAUSE A STAR THAT WAITS FOR A SERVER IS A STAR NOBODY
 * TAPS. The fill flips on the press and the count moves with it; if the
 * write fails it flips back and says why. A spinner on a one-bit control
 * is worse than being briefly wrong.
 *
 * IT IS A BUTTON, NOT A LINK, AND IT SITS INSIDE ONE. On the Explore
 * cards the whole row navigates to the event, so this stops the click
 * from bubbling — tapping the star must save, never open the page.
 */

export function InterestButton({
  eventId,
  initialSaved,
  initialCount,
  variant = "icon",
}: {
  eventId: string;
  initialSaved: boolean;
  initialCount: number;
  /** "icon" for a card corner, "full" for the event page. */
  variant?: "icon" | "full";
}) {
  const [truth, setTruth] = useState({ saved: initialSaved, count: initialCount });
  const [shown, apply] = useOptimistic(truth, (state, next: boolean) => ({
    saved: next,
    count: Math.max(0, state.count + (next ? 1 : -1)),
  }));
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const press = (e: React.MouseEvent) => {
    // The card around this is a link to the event.
    e.preventDefault();
    e.stopPropagation();

    start(async () => {
      const next = !shown.saved;
      apply(next);
      setFailed(false);

      const res = await toggleInterest(eventId);
      if (res.ok) setTruth({ saved: res.saved, count: res.count });
      else setFailed(true);
    });
  };

  const label = shown.saved ? "Saved — tap to remove" : "Save this event";

  // The full variant lives on the event page, which is Daylight, so it
  // wears Daylight tokens. NOT acid when saved: acid marks the one next
  // action on a screen and on this screen that is "Get tickets" — a second
  // acid control and neither is pointing at anything.
  if (variant === "full") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={press}
          disabled={pending}
          aria-pressed={shown.saved}
          className={`flex h-11 items-center justify-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] px-5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-[1px] disabled:opacity-70 ${
            shown.saved
              ? "bg-[var(--dl-ink)] text-[var(--dl-paper)]"
              : "bg-transparent text-[var(--dl-ink)]"
          }`}
        >
          <Star
            className="h-4 w-4"
            strokeWidth={2.25}
            fill={shown.saved ? "currentColor" : "none"}
          />
          {shown.saved ? "Interested" : "I'm interested"}
          {shown.count > 0 && (
            <span className="opacity-70">· {shown.count.toLocaleString("en-NG")}</span>
          )}
        </button>
        {failed && (
          <p className="text-[12px] font-bold text-[var(--dl-danger)]">
            That didn&apos;t save. Check your connection and try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={press}
      disabled={pending}
      aria-pressed={shown.saved}
      aria-label={label}
      title={failed ? "That didn't save — try again" : label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-70 ${
        shown.saved
          ? "border-[var(--marker)] bg-[var(--marker)] text-[var(--ink)]"
          : "border-[var(--hairline)] text-[var(--on-ground-faint)] hover:border-[var(--hairline-firm)] hover:text-[var(--on-ground)]"
      }`}
    >
      <Star className="h-[15px] w-[15px]" strokeWidth={2.25} fill={shown.saved ? "currentColor" : "none"} />
    </button>
  );
}
