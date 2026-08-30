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
 * The sidebar, in Daylight.
 *
 * A full-ink 2px rule divides it from the page rather than a faint hairline,
 * and the active item is a solid ink block rather than a tinted pill. Those
 * two choices carry most of the direction: the ground is soft, everything
 * structural is hard.
 *
 * "New event" is the one acid control in the whole shell. Nothing else in
 * here may take that colour — the moment a second thing is acid, neither is
 * pointing at anything.
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
    `group flex h-10 items-center rounded-[3px] text-[14.5px] transition-colors ${
      active
        ? "bg-[var(--dl-ink)] font-extrabold text-[var(--dl-paper)]"
        : "font-semibold text-[var(--dl-ink-soft)] hover:bg-[rgba(20,16,24,0.06)] hover:text-[var(--dl-ink)]"
    } ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`;

  const icon = `shrink-0 ${isCollapsed ? "h-5 w-5" : "h-[17px] w-[17px]"}`;
  const label = `truncate transition-all duration-300 ${
    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
  }`;
  const groupLabel =
    "mb-2 px-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";

  return (
    <aside
      className={`relative hidden h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r-2 border-[var(--dl-line)] transition-[width] duration-300 ease-in-out lg:flex ${
        isCollapsed ? "w-[84px]" : "w-[248px]"
      }`}
    >
      <div className="flex h-[68px] shrink-0 items-center justify-between px-4">
        <Link
          href="/overview"
          className={`overflow-hidden text-[19px] font-extrabold tracking-[-0.03em] transition-all duration-300 ${
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          Paylance
        </Link>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand the menu" : "Collapse the menu"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] text-[var(--dl-ink-faint)] transition-colors hover:bg-[rgba(20,16,24,0.06)] hover:text-[var(--dl-ink)] ${
            isCollapsed ? "mx-auto" : ""
          }`}
        >
          {isCollapsed ? (
            <ChevronsRight strokeWidth={2} className="h-[18px] w-[18px]" />
          ) : (
            <ChevronsLeft strokeWidth={2} className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>

      <div className="px-3 pb-6">
        <Link
          href="/events/create"
          title={isCollapsed ? "New event" : undefined}
          className={`flex h-10 items-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-acid)] text-[13.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-ink)] transition-transform hover:-translate-y-[1px] ${
            isCollapsed ? "justify-center px-0" : "gap-2 px-3"
          }`}
        >
          <Plus strokeWidth={2.75} className="h-[17px] w-[17px] shrink-0" />
          <span className={label}>New event</span>
        </Link>
      </div>

      <div className="flex-1 px-3">
        {navGroups.map((group, index) => (
          <div key={group.title} className={index !== 0 ? "mt-7" : ""}>
            <p
              className={`${groupLabel} transition-all duration-300 ${
                isCollapsed ? "h-0 overflow-hidden opacity-0" : "opacity-100"
              }`}
            >
              {group.title}
            </p>

            {isCollapsed && index !== 0 && (
              <div className="mx-auto mb-4 mt-2 h-[2px] w-7 bg-[var(--dl-line)]" />
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
                    <entry.icon strokeWidth={2} className={icon} />
                    <span className={label}>{entry.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t-2 border-[var(--dl-line)] p-3">
        <Link href="/settings" className={item(pathname === "/settings")}>
          <Settings2 strokeWidth={2} className={icon} />
          <span className={label}>Settings</span>
        </Link>

        {userHandle && (
          <Link
            href={`/${userHandle}` as never}
            target="_blank"
            title={isCollapsed ? "Your public page" : undefined}
            className={item(false)}
          >
            <ExternalLink strokeWidth={2} className={icon} />
            <span className={label}>Your public page</span>
          </Link>
        )}

        <button
          onClick={() => signOut()}
          className={`flex h-10 w-full items-center rounded-[3px] text-[14.5px] font-semibold text-[var(--dl-ink-soft)] transition-colors hover:bg-[rgba(255,75,99,0.12)] hover:text-[var(--dl-danger)] ${
            isCollapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
        >
          <LogOut strokeWidth={2} className={icon} />
          <span className={label}>Log out</span>
        </button>

        <div
          className={`mt-3 flex w-full items-center border-t-2 border-[var(--dl-line)] pt-3 ${
            isCollapsed ? "justify-center" : "gap-3 text-left"
          }`}
        >
          {userPhoto ? (
            <Image
              src={userPhoto}
              alt=""
              width={34}
              height={34}
              className="h-[34px] w-[34px] shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] object-cover"
            />
          ) : (
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] text-[13px] font-extrabold">
              {(userName[0] || "P").toUpperCase()}
            </span>
          )}

          <div
            className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
              isCollapsed ? "hidden opacity-0" : "opacity-100"
            }`}
          >
            <span className="truncate text-[13.5px] font-extrabold">{userName}</span>
            <span className="truncate text-[11.5px] text-[var(--dl-ink-faint)]">
              {userEmail}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
