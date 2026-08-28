import Link from "next/link";
import { LEGAL_NAV, MARKETING_NAV } from "./nav-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--hairline)] px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 rotate-[-4deg] items-center justify-center rounded-lg bg-[var(--coral)] text-[11px] font-black text-white">
            P
          </span>
          <span className="text-[15px] font-extrabold tracking-tight">Paylance</span>
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {MARKETING_NAV.map(([to, label]) => (
            <Link key={to} href={to} className="text-[12px] font-semibold text-[var(--on-ground-soft)] hover:text-[var(--on-ground)]">
              {label}
            </Link>
          ))}
          <Link href="/login" className="text-[12px] font-semibold text-[var(--on-ground-soft)] hover:text-[var(--on-ground)]">
            Sign in
          </Link>
        </div>

        <p className="text-[12px] text-[var(--on-ground-faint)]">© {new Date().getFullYear()} Paylance</p>
      </div>

      {/* Legal sits on its own line: findable when looked for, quiet otherwise. */}
      <div className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[var(--hairline)] pt-6">
        {LEGAL_NAV.map(([to, label]) => (
          <Link
            key={to}
            href={to}
            className="text-[12px] text-[var(--on-ground-faint)] hover:text-[var(--on-ground-soft)]"
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
