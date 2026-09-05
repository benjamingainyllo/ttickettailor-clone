import Link from "next/link";
import type { Trend } from "@/lib/dashboard-shape";

/**
 * A number, which way it is going, and its recent shape.
 *
 * A TOTAL ON ITS OWN IS NOT INFORMATION. "₦3,000 in fees" says nothing
 * until you know it was ₦900 last month. The delta is the point of this
 * component; the sparkline is what tells you whether the delta came from
 * steady growth or one big Saturday.
 *
 * Drawn as inline SVG rather than a chart library: forty of these render
 * on one page, and a charting runtime per tile is a slow dashboard.
 */

/** Status colour, not the categorical palette — up and down are states. */
const UP = "#17714A";
const DOWN = "#C9294A";
const FLAT = "#6C6478";

export function Sparkline({
  data,
  tone = "ink",
  className = "",
}: {
  data: number[];
  tone?: "ink" | "up" | "down";
  className?: string;
}) {
  if (!data.length) return null;

  const w = 108;
  const h = 30;
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? w / (data.length - 1) : w;

  const points = data.map((v, i) => {
    const x = i * step;
    // 2px of headroom top and bottom so a peak isn't clipped by the box.
    const y = h - 2 - (v / max) * (h - 4);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const stroke = tone === "up" ? UP : tone === "down" ? DOWN : "#141018";
  const id = `spark-${tone}-${data.length}-${Math.round(max)}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-[30px] w-[108px] ${className}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Trend over the last ${data.length} days`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.2} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.75}
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function TrendChip({ trend, invert = false }: { trend: Trend; invert?: boolean }) {
  // No previous period is not "0% change" — say so rather than imply a
  // comparison that was never made.
  if (trend.changePct === null) {
    return (
      <span className="text-[11.5px] font-bold text-[var(--dl-ink-faint)]">
        {trend.value > 0 ? "first month" : "nothing yet"}
      </span>
    );
  }

  // On most figures up is good. On refunds and disputes it is not, so the
  // colour follows meaning rather than direction.
  const good = invert ? trend.direction === "down" : trend.direction === "up";
  const colour =
    trend.direction === "flat" ? FLAT : good ? UP : DOWN;
  const arrow = trend.direction === "flat" ? "→" : trend.direction === "up" ? "↑" : "↓";

  return (
    <span
      className="inline-flex items-center gap-1 text-[11.5px] font-extrabold"
      style={{ color: colour }}
      title="Compared with the previous 30 days"
    >
      {arrow} {Math.abs(trend.changePct).toFixed(1)}%
    </span>
  );
}

/**
 * The headline row.
 *
 * Each tile carries a value, a delta and a shape. Kept as one ruled block
 * rather than four floating cards, because that is how every other figure
 * row in this product already reads.
 */
export function StatTiles({
  items,
}: {
  items: {
    label: string;
    value: string;
    note?: string;
    trend?: Trend;
    spark?: number[];
    invert?: boolean;
    href?: string;
  }[];
}) {
  return (
    <div className="grid gap-0 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] sm:grid-cols-2 lg:grid-cols-4">
      {items.map((f, i) => {
        // The sparkline sits UNDER the value at full tile width, not
        // beside it. Sharing a row meant "₦1,080,000" rendered as
        // "₦1,08…" — a truncated figure on a money dashboard is worse
        // than no chart at all, and the full-width line reads better
        // anyway.
        const body = (
          <>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
              {f.label}
            </p>
            <p className="mt-1.5 text-[26px] font-extrabold leading-none tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
              {f.value}
            </p>
            {f.spark && f.spark.some((n) => n > 0) && (
              <Sparkline
                data={f.spark}
                tone={
                  f.trend?.direction === "down"
                    ? f.invert ? "up" : "down"
                    : f.trend?.direction === "up"
                      ? f.invert ? "down" : "up"
                      : "ink"
                }
                className="mt-2.5 !w-full"
              />
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {f.trend && <TrendChip trend={f.trend} invert={f.invert} />}
              {f.note && (
                <span className="text-[12px] text-[var(--dl-ink-soft)]">{f.note}</span>
              )}
            </div>
          </>
        );

        // Every border but the outer one, so the block reads as a grid at
        // any column count rather than a stack of cards.
        const edges = `px-5 py-4 ${i % 2 === 1 ? "sm:border-l-2" : ""} ${
          i >= 2 ? "sm:border-t-2" : ""
        } lg:border-t-0 ${i > 0 ? "lg:border-l-2" : "lg:border-l-0"} ${
          i > 0 ? "border-t-2 sm:border-t-0" : ""
        } border-[var(--dl-line)]`;

        return f.href ? (
          <Link key={f.label} href={f.href as never} className={`${edges} transition-colors hover:bg-black/[0.02]`}>
            {body}
          </Link>
        ) : (
          <div key={f.label} className={edges}>{body}</div>
        );
      })}
    </div>
  );
}
