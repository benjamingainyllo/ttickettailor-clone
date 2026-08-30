"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Plus,
  Settings2,
  UsersRound,
  Wallet,
} from "lucide-react";

/**
 * What an organiser actually does, in the order they do it.
 *
 * SELLING is the daily work: put an event up, watch it sell, see who is
 * coming. MONEY is the weekly check. Everything else is settings.
 *
 * Gone from the old creator product: Offers (digital downloads — merch now
 * lives on the event that sells it), Automations and Experiments, which were
 * both empty placeholder screens. A nav item that leads to "coming soon"
 * costs trust every time somebody clicks it hoping for something.
 */
const navGroups = [
  {
    title: "Selling",
    items: [
      { label: "Overview", icon: LayoutGrid, href: "/overview" },
      { label: "Events", icon: Calendar, href: "/events" },
      { label: "Attendees", icon: UsersRound, href: "/audience" },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Sales", icon: CreditCard, href: "/revenue" },
      { label: "Payouts", icon: Wallet, href: "/payouts" },
    ],
  },
];

/**
 * The sidebar.
 *
 * Repainted onto the brand — it was black-and-zinc with no brand colour in
 * it at all, which is what made the dashboard read as a different product
 * from the site that sells it.
 *
 * Three controls came out, all of which were decoration:
 *
 *   A SEARCH BOX with no state and no handler. It looked like the way to
 *   find an event and did nothing when you typed in it.
 *
 *   A DARK/LIGHT TOGGLE. The dashboard now renders inside .lp, which is a
 *   single dark world by design, so the switch had no effect on anything —
 *   a control that visibly does nothing is worse than no control.
 *
 *   A GREEN PRESENCE DOT on the avatar, which implied an online status
 *   this product does not have and never checks.
 *
 * What replaced them is the one button an organiser actually wants at hand:
 * make an event.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userName = profile?.first_name || user?.user_metadata?.first_name || "Organiser";
  const userEmail = user?.email || "";
  const userHandle = profile?.handle || "";
  const userPhoto = profile?.avatar_url || null;

  const item = (active: boolean) =>
    `group flex h-10 items-center rounded-xl text-[14px] transition-colors ${
      active
        ? "bg-[var(--ground-raised)] font-bold text-[var(--on-ground)]"
        : "font-semibold text-[var(--on-ground-soft)] hover:bg-[var(--ground-deep)] hover:text-[var(--on-ground)]"
    } ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`;

  const icon = `shrink-0 ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`;
  const label = `truncate transition-all duration-300 ${
    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
  }`;

  return (
    <aside
      className={`relative hidden h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-[var(--hairline)] bg-[var(--ground)] transition-[width] duration-300 ease-in-out lg:flex ${
        isCollapsed ? "w-[80px]" : "w-[260px]"
      }`}
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
        <Link
          href="/overview"
          className={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 rotate-[-4deg] items-center justify-center rounded-lg border-2 border-[var(--ink)] bg-[var(--coral)] text-[13px] font-black text-white">
            P
          </span>
          <span className="truncate text-[17px] font-extrabold tracking-tight">
            Paylance
          </span>
        </Link>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand the menu" : "Collapse the menu"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--on-ground-faint)] transition-colors hover:bg-[var(--ground-deep)] hover:text-[var(--on-ground)] ${
            isCollapsed ? "mx-auto" : ""
          }`}
        >
          {isCollapsed ? (
            <ChevronsRight strokeWidth={1.75} className="h-5 w-5" />
          ) : (
            <ChevronsLeft strokeWidth={1.75} className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="px-3 pb-5 pt-1">
        <Link
          href="/events/create"
          title={isCollapsed ? "New event" : undefined}
          className={`flex h-10 items-center rounded-xl bg-[var(--coral)] text-[14px] font-extrabold text-white transition-opacity hover:opacity-90 ${
            isCollapsed ? "justify-center px-0" : "gap-2 px-3"
          }`}
        >
          <Plus strokeWidth={2.5} className="h-[18px] w-[18px] shrink-0" />
          <span className={label}>New event</span>
        </Link>
      </div>

      <div className="flex-1 px-3">
        {navGroups.map((group, index) => (
          <div key={group.title} className={index !== 0 ? "mt-7" : ""}>
            <p
              className={`mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-ground-faint)] transition-all duration-300 ${
                isCollapsed ? "h-0 overflow-hidden opacity-0" : "opacity-100"
              }`}
            >
              {group.title}
            </p>

            {isCollapsed && index !== 0 && (
              <div className="mx-auto mb-4 mt-2 h-px w-8 bg-[var(--hairline)]" />
            )}

            <nav className="space-y-1">
              {group.items.map((entry) => {
                const active = pathname === entry.href;
                return (
                  <Link
                    key={entry.label}
                    href={entry.href as never}
                    title={isCollapsed ? entry.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={item(active)}
                  >
                    <entry.icon
                      strokeWidth={1.75}
                      className={`${icon} ${active ? "text-[var(--coral)]" : ""}`}
                    />
                    <span className={label}>{entry.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-[var(--hairline)] p-3">
        <Link href="/settings" className={item(pathname === "/settings")}>
          <Settings2 strokeWidth={1.75} className={icon} />
          <span className={label}>Settings</span>
        </Link>

        {userHandle && (
          <Link
            href={`/${userHandle}` as never}
            target="_blank"
            title={isCollapsed ? "Your public page" : undefined}
            className={item(false)}
          >
            <ExternalLink strokeWidth={1.75} className={icon} />
            <span className={label}>Your public page</span>
          </Link>
        )}

        <button
          onClick={() => signOut()}
          className={`flex h-10 w-full items-center rounded-xl text-[14px] font-semibold text-[var(--on-ground-soft)] transition-colors hover:bg-[#FF6A451a] hover:text-[var(--coral)] ${
            isCollapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
        >
          <LogOut strokeWidth={1.75} className={icon} />
          <span className={label}>Log out</span>
        </button>

        <div
          className={`mt-3 flex w-full items-center border-t border-[var(--hairline)] pt-3 ${
            isCollapsed ? "justify-center" : "gap-3 text-left"
          }`}
        >
          {userPhoto ? (
            <Image
              src={userPhoto}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ground-raised)] text-[13px] font-extrabold text-[var(--on-ground-soft)]">
              {(userName[0] || "P").toUpperCase()}
            </span>
          )}

          <div
            className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
              isCollapsed ? "hidden opacity-0" : "opacity-100"
            }`}
          >
            <span className="truncate text-[13.5px] font-bold">{userName}</span>
            <span className="truncate text-[12px] text-[var(--on-ground-faint)]">
              {userEmail}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
