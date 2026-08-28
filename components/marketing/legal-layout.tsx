import type { ReactNode } from "react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { LEGAL, missingLegalDetails } from "@/lib/legal";

/**
 * The shared frame for the three legal pages.
 *
 * Long documents get their own reading measure and a plainer type scale
 * than the marketing pages — nobody reads a privacy notice for the
 * typography, and a 40px display heading every three paragraphs makes a
 * document harder to scan, not easier.
 */
export function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const missing = missingLegalDetails();

  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      <article className="mx-auto max-w-[46rem] px-6 py-16 sm:px-10 sm:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-soft)]">
          Legal
        </p>
        <h1 className="mt-4 text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[44px]">
          {title}
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-[var(--on-ground-soft)]">
          {intro}
        </p>
        <p className="mt-5 text-[13.5px] text-[var(--on-ground-faint)]">
          Last updated {LEGAL.updated}
        </p>

        {missing.length > 0 && (
          <div className="mt-8 rounded-xl border border-[var(--coral)]/50 bg-[var(--coral)]/10 px-5 py-4">
            <p className="text-[13.5px] font-bold text-[var(--coral)]">
              This document is not finished
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--on-ground-soft)]">
              The company details shown in square brackets below have not been
              filled in yet. Until they are, treat this page as a draft rather
              than a binding agreement.
            </p>
          </div>
        )}

        <div className="legal mt-12">{children}</div>

        <p className="mt-16 border-t border-[var(--hairline)] pt-6 text-[13.5px] leading-relaxed text-[var(--on-ground-faint)]">
          Questions about anything on this page? Write to {LEGAL.contactEmail}.
        </p>
      </article>

      <SiteFooter />
    </main>
  );
}

/** A numbered clause. Numbering is real structure here — people cite it. */
export function Clause({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-[19px] font-extrabold leading-snug tracking-tight">
        <span className="mr-2.5 text-[var(--coral)]">{n}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3.5">{children}</div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15.5px] leading-[1.7] text-[var(--on-ground-soft)]">
      {children}
    </p>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-3 text-[15.5px] leading-[1.7] text-[var(--on-ground-soft)]"
        >
          <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--coral)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** For the one or two points that genuinely change what someone should do. */
export function Important({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-raised)] px-5 py-4">
      <p className="text-[15.5px] leading-[1.7] text-[var(--on-ground)]">
        {children}
      </p>
    </div>
  );
}
