"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * One box that finds anything.
 *
 * Deliberately a plain form that posts to a results page rather than a
 * live-as-you-type dropdown. Every keystroke against a table of every
 * order on the platform is a query nobody asked for, and an admin
 * searching knows what they are looking for before they start typing.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 2) router.push(`/admin/search?q=${encodeURIComponent(q.trim())}` as never);
      }}
      className="relative"
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dl-ink-faint)]"
        strokeWidth={2.25}
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="Find an order, ticket, event or person…"
        aria-label="Search everything"
        className="w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] py-2.5 pl-9 pr-3 text-[14px] outline-none placeholder:text-[var(--dl-ink-faint)]"
      />
    </form>
  );
}
