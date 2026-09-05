"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Calendar,
  CreditCard,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Plus,
  Settings2,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";

/** Kept in step with the desktop sidebar — see the note there. */
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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const userName = profile?.first_name || user?.user_metadata?.first_name || "Organiser";
  const userEmail = user?.email || "";
  const userHandle = profile?.handle || "";
  const userPhoto = profile?.avatar_url || null;

  const item = (active: boolean) =>
    `flex h-11 items-center gap-3 rounded-[3px] px-3 text-[15px] transition-colors ${
      active
        ? "bg-[var(--dl-ink)] font-extrabold text-[var(--dl-paper)]"
        : "font-semibold text-[var(--dl-ink-soft)] hover:bg-[rgba(20,16,24,0.06)] hover:text-[var(--dl-ink)]"
    }`;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`dl fixed inset-y-0 right-0 z-50 flex w-[280px] flex-col overflow-y-auto border-l-2 border-[var(--dl-line)] font-[family-name:var(--font-bricolage-grotesque)] transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b-2 border-[var(--dl-line)] px-4">
          <span className="text-[15px] font-extrabold">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close the menu"
            className="flex h-11 w-11 items-center justify-center rounded-[3px] text-[var(--dl-ink-soft)] transition-colors hover:bg-[rgba(20,16,24,0.06)] hover:text-[var(--dl-ink)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3">
          <Link
            href="/events/create"
            onClick={onClose}
            className="flex h-11 items-center justify-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-acid)] text-[15px] font-extrabold text-[var(--dl-ink)]"
          >
            <Plus strokeWidth={2.5} className="h-[18px] w-[18px]" />
            New event
          </Link>
        </div>

        <div className="flex-1 px-3">
          {navGroups.map((group, index) => (
            <div key={group.title} className={index !== 0 ? "mt-6" : ""}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--dl-ink-faint)]">
                {group.title}
              </p>
              <nav className="space-y-1">
                {group.items.map((entry) => {
                  const active = pathname === entry.href;
                  return (
                    <Link
                      key={entry.label}
                      href={entry.href as never}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={item(active)}
                    >
                      <entry.icon
                        strokeWidth={1.75}
                        className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[var(--dl-ink)]" : ""}`}
                      />
                      {entry.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t-2 border-[var(--dl-line)] p-3">
          <Link href="/settings" onClick={onClose} className={item(pathname === "/settings")}>
            <Settings2 strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0" />
            Settings
          </Link>

          {userHandle && (
            <Link
              href={`/${userHandle}` as never}
              target="_blank"
              onClick={onClose}
              className={item(false)}
            >
              <ExternalLink strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0" />
              Your public page
            </Link>
          )}

          <button
            onClick={() => signOut()}
            className="flex h-11 w-full items-center gap-3 rounded-[3px] px-3 text-[15px] font-semibold text-[var(--dl-ink-soft)] transition-colors hover:bg-[rgba(255,75,99,0.12)] hover:text-[var(--dl-danger)]"
          >
            <LogOut strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0" />
            Log out
          </button>

          <div className="mt-3 flex items-center gap-3 border-t-2 border-[var(--dl-line)] pt-3">
            {userPhoto ? (
              <Image
                src={userPhoto}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-[3px] object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-[var(--dl-panel)] text-[13px] font-extrabold text-[var(--dl-ink-soft)]">
                {(userName[0] || "P").toUpperCase()}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13.5px] font-bold">{userName}</span>
              <span className="truncate text-[12px] text-[var(--dl-ink-faint)]">
                {userEmail}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
