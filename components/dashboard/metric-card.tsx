/**
 * One figure in the ruled block at the top of a page.
 *
 * This used to be a standalone card: its own border, its own drop of white
 * space, and a stock icon in a tinted rounded square in the corner. Four of
 * them across the top of a page is the single most recognisable shape in
 * generated software, and the icons carried no information — a wallet next
 * to a number that already says what it is.
 *
 * Now it is a segment. The parent draws one panel with a 2px ink rule and
 * these sit inside it divided by more of the same, which is how Overview
 * reads and therefore how every page reads. The number leads, because the
 * number is the reason anybody looked.
 *
 * `icon`, `iconColor` and `iconBgColor` are still accepted so callers do not
 * all have to change at once, and are deliberately ignored.
 */
interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon?: unknown;
  iconColor?: string;
  iconBgColor?: string;
}

export function MetricCard({ title, value, change }: MetricCardProps) {
  return (
    <div className="min-w-[152px] flex-1 border-l-2 border-[var(--dl-line)] px-5 py-4 first:border-l-0">
      <p className="text-[27px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
        {value}
      </p>
      <p className="mt-1 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
        {title}
      </p>
      <p className="mt-1 text-[12px] text-[var(--dl-ink-soft)]">{change}</p>
    </div>
  );
}
