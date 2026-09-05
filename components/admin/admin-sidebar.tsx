"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, AlertTriangle, ArrowUpRight, Calendar, ChevronsLeft, ChevronsRight,
  CreditCard, Gavel, LayoutGrid, LogOut, Menu, Receipt, RotateCcw, Settings2,
  ShieldCheck, Ticket, UserRound, UsersRound, Wallet, X,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import type { AdminRole } from "@/lib/admin-roles";

/**
 * The owner console's sidebar.
 *
 * DELIBERATELY THE SAME OBJECT AS THE ORGANISER'S. It was a column inside
 * a centred 1400px document, which left the whole console floating in the
 * middle of a wide screen with a band of wallpaper down the left — a
 * report about the platform rather than the thing you run it with. This
 * is the product's own shell: pinned to the edge, full height, its own
 * scroll, a 2px rule dividing it from the work. An internal tool that
 * doesn't sit like the product is a tool people distrust.
 *
 * SECTIONS ARE HIDDEN BY ROLE, BUT HIDING IS NOT THE SECURITY. Every page
 * behind these links re-checks the capability on the server. This only
 * stops a support user staring at links that would refuse them.
 *
 * NO ACID ANYWHERE IN HERE. Acid marks the one next action, and in a
 * console there isn't one — you arrive to find out what needs doing, and
 * a permanent green button would be pointing at nothing.
 */

const GROUPS: {
  label: string | null;
  items: { href: string; label: string; icon: typeof LayoutGrid; needs?: AdminRole[] }[];
}[] = [
  { label: null, items: [{ href: "/admin", label: "Overview", icon: LayoutGrid }] },
  { label: "Events", items: [{ href: "/admin/events", label: "All events", icon: Calendar }] },
  {
    label: "People",
    items: [
      { href: "/admin/organisers", label: "Organisers", icon: UsersRound },
      { href: "/admin/customers", label: "Customers", icon: UserRound },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: Receipt },
      { href: "/admin/tickets", label: "Tickets", icon: Ticket },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/payouts", label: "Payouts", icon: Wallet },
      { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
    ],
  },
  {
    label: "Split payments",
    items: [{ href: "/admin/splits", label: "All groups", icon: UsersRound }],
  },
  {
    label: "Risk",
    items: [
      { href: "/admin/attention", label: "Needs attention", icon: AlertTriangle },
      { href: "/admin/disputes", label: "Disputes", icon: Gavel },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/admins", label: "Admin users", icon: ShieldCheck, needs: ["super_admin"] },
      { href: "/admin/activity", label: "Activity log", icon: Activity },
      { href: "/admin/settings", label: "Settings", icon: Settings2, needs: ["super_admin"] },
    ],
  },
];

function visibleGroups(role: AdminRole) {
  return GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.needs || i.needs.includes(role)),
  })).filter((g) => g.items.length > 0);
}

/** Exact match for /admin so it isn't lit on every page. */
function isOn(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebar({ role, email }: { role: AdminRole; email: string | null }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const item = (active: boolean) =>
    `group flex h-9 items-center rounded-[3px] text-[14px] transition-colors ${
      active
        ? "bg-[var(--dl-ink)] font-extrabold text-[var(--dl-paper)]"
        : "font-semibold text-[var(--dl-ink-soft)] hover:bg-[rgba(20,16,24,0.06)] hover:text-[var(--dl-ink)]"
    } ${collapsed ? "justify-center px-0" : "gap-3 px-3"}`;

  const icon = "h-[16px] w-[16px] shrink-0";
  const text = `truncate ${collapsed ? "hidden" : ""}`;

  return (
    <aside
      className={`relative hidden h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r-2 border-[var(--dl-line)] transition-[width] duration-200 lg:flex ${
        collapsed ? "w-[76px]" : "w-[236px]"
      }`}
    >
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b-2 border-[var(--dl-line)] px-4">
        <Link
          href="/admin"
          className={`overflow-hidden whitespace-nowrap text-[16px] font-extrabold tracking-[-0.03em] ${
            collapsed ? "hidden" : ""
          }`}
        >
          Paylance <span className="text-[var(--dl-ink-faint)]">owner</span>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] text-[var(--dl-ink-faint)] transition-colors hover:bg-[rgba(20,16,24,0.06)] hover:text-[var(--dl-ink)] ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          {collapsed ? <ChevronsRight className="h-[17px] w-[17px]" /> : <ChevronsLeft className="h-[17px] w-[17px]" />}
        </button>
      </div>

      <div className="flex-1 px-3 py-4">
        {visibleGroups(role).map((g, gi) => (
          <div key={g.label ?? "top"} className={gi !== 0 ? "mt-5" : ""}>
            {g.label && !collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                {g.label}
              </p>
            )}
            {g.label && collapsed && gi !== 0 && (
              <div className="mx-auto mb-3 mt-1 h-[2px] w-6 bg-[var(--dl-line)]" />
            )}
            <nav className="space-y-0.5">
              {g.items.map((i) => {
                const on = isOn(pathname, i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href as never}
                    title={collapsed ? i.label : undefined}
                    aria-current={on ? "page" : undefined}
                    className={item(on)}
                  >
                    <i.icon strokeWidth={2} className={icon} />
                    <span className={text}>{i.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t-2 border-[var(--dl-line)] p-3">
        <Link href="/overview" className={item(false)}>
          <ArrowUpRight strokeWidth={2} className={icon} />
          <span className={text}>Your own dashboard</span>
        </Link>
        <button
          onClick={() => signOut()}
          className={`flex h-9 w-full items-center rounded-[3px] text-[14px] font-semibold text-[var(--dl-ink-soft)] transition-colors hover:bg-[rgba(255,75,99,0.12)] hover:text-[var(--dl-danger)] ${
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
        >
          <LogOut strokeWidth={2} className={icon} />
          <span className={text}>Log out</span>
        </button>

        {!collapsed && (
          <div className="mt-3 border-t-2 border-[var(--dl-line)] pt-3">
            <p className="truncate text-[12.5px] font-extrabold">{email ?? "—"}</p>
            <p className="text-[11.5px] uppercase tracking-[0.1em] text-[var(--dl-ink-faint)]">
              {role.replace("_", " ")}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

/** The same menu on a phone, behind one button. */
export function AdminMobileHeader({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Any navigation closes it. Without this the drawer stays over the page
  // you just asked for.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b-2 border-[var(--dl-line)] bg-[var(--dl-paper)] px-4 lg:hidden">
        <Link href="/admin" className="flex h-11 items-center text-[16px] font-extrabold tracking-[-0.03em]">
          Paylance <span className="ml-1 text-[var(--dl-ink-faint)]">owner</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open the menu"
          className="flex h-11 w-11 items-center justify-center rounded-[3px] text-[var(--dl-ink-soft)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative ml-auto flex h-full w-[260px] flex-col overflow-y-auto border-l-2 border-[var(--dl-line)] bg-[var(--dl-paper)] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-extrabold">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close the menu"
                className="flex h-11 w-11 items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {visibleGroups(role).map((g, gi) => (
              <div key={g.label ?? "top"} className={gi !== 0 ? "mt-4" : ""}>
                {g.label && (
                  <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                    {g.label}
                  </p>
                )}
                {g.items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href as never}
                    className={`flex h-11 items-center gap-3 rounded-[3px] px-3 text-[14px] ${
                      isOn(pathname, i.href)
                        ? "bg-[var(--dl-ink)] font-extrabold text-[var(--dl-paper)]"
                        : "font-semibold text-[var(--dl-ink-soft)]"
                    }`}
                  >
                    <i.icon strokeWidth={2} className="h-[16px] w-[16px] shrink-0" />
                    {i.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
