"use client";

import { Plus, X } from "lucide-react";

/**
 * The other people throwing it.
 *
 * NAMES ON A FLYER, NOT ACCOUNTS. A cohost here has no login, no
 * permissions, no access to the door scanner and no share of the money.
 * That is a deliberate first version: giving a cohost the scanner or edit
 * rights is a real security decision, and it should be made on purpose
 * rather than inherited from a text field.
 *
 * The handle is optional and links to their Paylance page when they have
 * one, which is the bit that makes cohosting worth anything for reach.
 */

export interface CohostDraft {
  name: string;
  handle: string;
}

const MAX_COHOSTS = 8;

export function CohostEditor({
  cohosts,
  onChange,
}: {
  cohosts: CohostDraft[];
  onChange: (next: CohostDraft[]) => void;
}) {
  const set = (i: number, patch: Partial<CohostDraft>) =>
    onChange(cohosts.map((c, n) => (n === i ? { ...c, ...patch } : c)));

  const field =
    "w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 py-2.5 text-[14.5px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--dl-ink)]";

  return (
    <div className="flex flex-col gap-2.5">
      {cohosts.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={c.name}
            onChange={(e) => set(i, { name: e.target.value })}
            placeholder="Their name"
            maxLength={60}
            className={`${field} flex-[2]`}
            aria-label={`Cohost ${i + 1} name`}
          />
          <div className="relative flex-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14.5px] font-bold text-[var(--dl-ink-faint)]"
            >
              @
            </span>
            <input
              value={c.handle}
              onChange={(e) =>
                // Whatever they paste, we keep a handle: strip a leading @,
                // a pasted full URL, and anything that isn't handle-shaped.
                set(i, {
                  handle: e.target.value
                    .replace(/^.*\//, "")
                    .replace(/^@/, "")
                    .replace(/[^A-Za-z0-9_.-]/g, "")
                    .toLowerCase(),
                })
              }
              placeholder="handle (optional)"
              maxLength={40}
              className={`${field} pl-7`}
              aria-label={`Cohost ${i + 1} handle`}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(cohosts.filter((_, n) => n !== i))}
            aria-label={`Remove cohost ${i + 1}`}
            className="shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] p-2.5 transition-transform hover:-translate-y-[1px]"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      ))}

      {cohosts.length < MAX_COHOSTS && (
        <button
          type="button"
          onClick={() => onChange([...cohosts, { name: "", handle: "" }])}
          className="flex items-center gap-2 self-start rounded-[3px] border-2 border-[var(--dl-line)] px-3.5 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-[1px]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          Add cohost
        </button>
      )}
    </div>
  );
}

/** Drop blanks and de-duplicate before writing. */
export function cleanCohosts(drafts: CohostDraft[]) {
  const seen = new Set<string>();
  return drafts
    .map((c) => ({ name: c.name.trim(), handle: c.handle.trim() }))
    .filter((c) => {
      if (!c.name) return false;
      const key = c.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_COHOSTS);
}
