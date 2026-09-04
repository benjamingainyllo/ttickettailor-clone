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
 * The preview above shows their real title, not a sample string, because
 * "Detty December" and "Untitled Event" sit very differently in a script.
 */
export function TitleStylePicker({
  title,
  value,
  onChange,
}: {
  title: string;
  value: TitleStyleId;
  onChange: (id: TitleStyleId) => void;
}) {
  const shown = title.trim() || "Untitled Event";

  return (
    <div>
      {/* The result, at roughly the size the public page uses. */}
      <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-5 py-6">
        <p
          className="break-words text-[var(--dl-ink)]"
          style={titleStyleCss(value, 40)}
        >
          {shown}
        </p>
      </div>

      {/* Horizontally scrollable so seven options never wrap into a
          ragged block on a phone. */}
      <div
        className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1"
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
