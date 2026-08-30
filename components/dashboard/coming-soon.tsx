import type { LucideIcon } from "lucide-react";
import { Hammer } from "lucide-react";
import Link from "next/link";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  /** One line on what this page will do once it exists. */
  summary: string;
  /** What it's expected to cover. Stated as intent, never as progress. */
  planned: string[];
  /** Somewhere genuinely useful to go instead. */
  insteadHref: string;
  insteadLabel: string;
}

/**
 * A page that hasn't been built yet.
 *
 * Deliberately plain: no fake progress bars, no invented "queued" items, no
 * percentages. Someone landing here should understand immediately that there
 * is nothing to use, and be pointed at something that does work.
 */
export function ComingSoon({
  icon: Icon,
  title,
  summary,
  planned,
  insteadHref,
  insteadLabel,
}: ComingSoonProps) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text">{title}</h1>
        <p className="mt-1 text-xs text-subtle">{summary}</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8 sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-subtle">
          <Icon className="h-6 w-6" />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFDE5940] bg-[#FFDE591a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--marker)]">
            <Hammer className="h-3 w-3" />
            Not built yet
          </span>
        </div>

        <h2 className="mt-4 max-w-lg text-lg font-bold text-text">
          There&apos;s nothing here to use yet.
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-subtle">
          This page is a placeholder in the navigation. Nothing is running behind it, and
          nothing on it is real — it&apos;s here so the shape of the product is visible while
          the parts that handle your money get finished first.
        </p>

        <div className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">
            What it will cover
          </p>
          <ul className="mt-3 space-y-2">
            {planned.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-subtle">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-subtle/50" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href={insteadHref as any}
          className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-text px-5 text-xs font-bold text-background transition-transform hover:scale-[1.02]"
        >
          {insteadLabel}
        </Link>
      </div>
    </section>
  );
}
