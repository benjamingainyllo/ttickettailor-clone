import Link from "next/link";
import { FOOTER_COLUMNS } from "./nav-links";

/**
 * The footer, in columns.
 *
 * Every link here goes somewhere that exists. The reference this follows
 * carries About, Press, Careers, a help centre and five social accounts —
 * none of which we have, and a column of dead links looks far worse than a
 * short column of real ones. Columns get added as the pages behind them do;
 * FOOTER_COLUMNS is where.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--hairline)] px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-16">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 self-start">
            <span className="flex h-9 w-9 rotate-[-4deg] items-center justify-center rounded-lg border-2 border-[var(--ink)] bg-[var(--coral)] text-[14px] font-black text-white">
              P
            </span>
            <span className="text-[21px] font-extrabold tracking-tight">Paylance</span>
          </Link>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:flex lg:gap-x-16">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-[13px] font-semibold text-[var(--on-ground-faint)]">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-3">
                  {column.links.map(([href, label]) => (
                    <li key={`${href}-${label}`}>
                      <Link
                        href={href}
                        className="text-[14px] text-[var(--on-ground-soft)] transition-colors hover:text-[var(--on-ground)]"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-[var(--hairline)] pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-[var(--on-ground-faint)]">
            © {new Date().getFullYear()} Paylance
          </p>
          <p className="text-[12.5px] text-[var(--on-ground-faint)]">
            A flat fee per ticket. Never a percentage.
          </p>
        </div>
      </div>
    </footer>
  );
}
