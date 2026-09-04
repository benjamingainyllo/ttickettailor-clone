"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/admin-roles";

/**
 * The admin sidebar.
 *
 * SECTIONS ARE HIDDEN BY ROLE, BUT HIDING IS NOT THE SECURITY. Every page
 * behind these links re-checks the capability on the server. This just
 * stops a support user staring at four links that would refuse them.
 */

const GROUPS: {
  label: string | null;
  items: { href: string; label: string; needs?: AdminRole[] }[];
}[] = [
  { label: null, items: [{ href: "/admin", label: "Overview" }] },
  { label: "Events", items: [{ href: "/admin/events", label: "All events" }] },
  {
    label: "People",
    items: [
      { href: "/admin/organisers", label: "Organisers" },
      { href: "/admin/customers", label: "Customers" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/admins", label: "Admin users", needs: ["super_admin"] },
      { href: "/admin/activity", label: "Activity log" },
    ],
  },
];

export function AdminNav({ role, email }: { role: AdminRole; email: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.needs || i.needs.includes(role));
        if (items.length === 0) return null;
        return (
          <div key={g.label ?? "top"}>
            {g.label && (
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                {g.label}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {items.map((i) => {
                // Exact match for /admin so it isn't lit on every page.
                const on =
                  i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href as never}
                    className={`rounded-[3px] px-3 py-2 text-[14px] font-bold transition-colors ${
                      on
                        ? "bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                        : "text-[var(--dl-ink-soft)] hover:bg-black/[0.04] hover:text-[var(--dl-ink)]"
                    }`}
                  >
                    {i.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-2 border-t-2 border-[var(--dl-line)] pt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
          Signed in as
        </p>
        <p className="mt-1.5 truncate text-[13px] font-bold">{email ?? "—"}</p>
        <p className="text-[12px] text-[var(--dl-ink-soft)]">{role.replace("_", " ")}</p>
      </div>
    </nav>
  );
}
