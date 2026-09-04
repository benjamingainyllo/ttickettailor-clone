"use client";

import { TITLE_STYLES, titleStyleCss, type TitleStyleId } from "@/lib/title-styles";

/**
 * Pick the face the event title wears.
 *
 * EACH OPTION IS SET IN ITSELF. A row of buttons reading "Fancy" and
 * "Literary" in the same typeface asks the organiser to imagine the
 * result; showing each word in its own face means there is nothing to
 * imagine. That is the whole design of this control.
 *
 * THERE IS NO PREVIEW HERE, ON PURPOSE. The first version put a preview
 * panel under the title field, which meant the organiser looked at their
 * own event name twice on one screen — once as the thing they were
 * typing, once as a picture of it. The title input renders in the chosen
 * face instead, so the field IS the preview and there is nothing to keep
 * in sync.
 */
export function TitleStylePicker({
  value,
  onChange,
}: {
  value: TitleStyleId;
  onChange: (id: TitleStyleId) => void;
}) {
  return (
    <div>
      {/* Horizontally scrollable so seven options never wrap into a
          ragged block on a phone. */}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="radiogroup"
        aria-label="Title style"
      >
        {TITLE_STYLES.map((s) => {
          const on = s.id === value;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(s.id)}
              className={`shrink-0 rounded-full border-2 border-[var(--dl-line)] px-4 py-2 transition-transform hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dl-ink)] focus-visible:ring-offset-2 ${
                on ? "bg-[var(--dl-ink)] text-[var(--dl-paper)]" : "bg-[var(--dl-panel)]"
              }`}
              // The label wears the face it names. Fixed at 15px rather
              // than the display size, so a script doesn't blow the chip
              // out of the row.
              style={{ ...titleStyleCss(s.id, 15), lineHeight: 1.1 }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
