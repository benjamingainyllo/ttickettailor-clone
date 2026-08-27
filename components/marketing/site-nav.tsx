"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { MARKETING_NAV } from "./nav-links";

/**
 * The marketing site's nav, shared by every public page.
 *
 * It reads the session so a signed-in organiser gets "Dashboard" instead of
 * "Get started" — which is why this is a client component, and why the
 * pages that use it can still be server-rendered.
 */

export function SiteNav() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  // Only trust the session after mount: the server has no cookie context,
  // so rendering "Dashboard" before then would flash the wrong label.
  const signedIn = mounted && !!user;
  const href = signedIn ? "/overview" : "/login";

  return (
    <header className="sticky top-0 z-50 border-b-2 border-[var(--ink)] bg-[var(--paper)]">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 rotate-[-4deg] items-center justify-center rounded-lg border-2 border-[var(--ink)] bg-[var(--coral)] text-[13px] font-black text-white">
            P
          </span>
          <span className="text-[17px] font-extrabold tracking-tight">Paylance</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {MARKETING_NAV.map(([to, label]) => (
            <Link
              key={to}
              href={to}
              className="text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {!signedIn && (
            <Link href="/login" className="text-[13px] font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]">
              Sign in
            </Link>
          )}
          <Link
            href={href}
            className="lp-block-soft rounded-xl bg-[var(--ink)] px-4 py-2 text-[12px] font-bold text-[var(--paper)] transition-transform hover:-translate-y-0.5"
          >
            {signedIn ? "Dashboard" : "Get started"}
          </Link>
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[var(--ink)] md:hidden"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t-2 border-[var(--ink)] px-6 py-4 sm:px-10 md:hidden lg:px-16">
          <div className="flex flex-col gap-4">
            {MARKETING_NAV.map(([to, label]) => (
              <Link
                key={to}
                href={to}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold text-[var(--ink-soft)]"
              >
                {label}
              </Link>
            ))}
            <Link
              href={href}
              className="lp-block-soft rounded-xl bg-[var(--ink)] px-4 py-3 text-center text-xs font-bold text-[var(--paper)]"
            >
              {signedIn ? "Dashboard" : "Get started"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/** The primary call to action, wherever a page needs one. */
export function StartCta({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const signedIn = mounted && !!user;

  return (
    <Link
      href={signedIn ? "/overview" : "/login"}
      className={`lp-block inline-flex items-center gap-2 rounded-2xl bg-[var(--paper)] px-7 py-4 text-[15px] font-extrabold text-[var(--ink)] transition-transform hover:-translate-y-1 ${className}`}
    >
      {signedIn ? "Go to dashboard" : "Start selling — it's free"}
    </Link>
  );
}
