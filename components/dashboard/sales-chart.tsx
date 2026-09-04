"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatKobo } from "@/lib/money";
import {
  buildSalesSeries, niceTicks, summariseSeries,
  type SalesOrderRow, type SalesPoint,
} from "@/lib/sales-series";

/**
 * Sales over time.
 *
 * COLOUR CARRIES THE MEASURE. Money is green and tickets are indigo, so the
 * toggle changes something you can see at a glance rather than only a label.
 * Both were checked against the white panel for contrast and for colour
 * blindness before being used.
 *
 * Acid is still deliberately absent: the house rule is one acid area per
 * screen and it belongs to whatever the organiser should click next, which
 * is never a chart. Full ink was the first attempt and it read as dead —
 * a hairline over a mostly-empty plot looks like a broken page rather than
 * a quiet month. The area fill under the line is what fixes that, not the
 * hue on its own.
 *
 * ONE MEASURE AT A TIME, ON PURPOSE. Money and tickets have nothing to do
 * with each other numerically — a second y-axis would let ₦2m and 4 tickets
 * share a plot and imply a relationship between two lines that only ever
 * crossed because of the scaling. The toggle costs a click and cannot lie.
 *
 * AN EMPTY MONTH STILL DRAWS. A new organiser has thirty days of nothing,
 * and the honest picture of that is a real grid with the line resting on
 * zero — not a spinner, not "no data", and not a hidden chart. It reads as
 * "nobody has bought yet", which is exactly what happened.
 */

type Measure = "money" | "tickets";
const RANGES = [7, 30, 90] as const;

/**
 * One hue per measure. Deep enough to hold a 2px stroke on white, far
 * enough apart to stay distinct for a red/green colour-blind reader.
 */
const HUE: Record<Measure, string> = {
  money: "#17714A",   // the mint of the light palette — money coming in
  tickets: "#4257C4", // the periwinkle, deepened for light — a count
};

/** Axis labels only. The tooltip always shows the exact figure. */
function compactNaira(kobo: number): string {
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(naira >= 10_000_000 ? 0 : 1)}m`;
  if (naira >= 1_000) return `₦${Math.round(naira / 1_000)}k`;
  return `₦${Math.round(naira)}`;
}

export function SalesChart({ orders }: { orders: readonly SalesOrderRow[] }) {
  const [days, setDays] = useState<number>(30);
  const [measure, setMeasure] = useState<Measure>("money");
  const [stillFrames, setStillFrames] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStillFrames(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const points = useMemo(() => buildSalesSeries(orders, days), [orders, days]);
  const totals = useMemo(() => summariseSeries(points), [points]);

  const value = (p: SalesPoint) => (measure === "money" ? p.kobo : p.tickets);
  const max = points.reduce((m, p) => Math.max(m, value(p)), 0);

  // An empty window still needs a scale, and the scale has to be in the
  // right unit. Ticks of 0–4 are right for tickets and nonsense for money:
  // four kobo all format to "₦0", so the axis came out as five identical
  // labels stacked up the side. Money gets ₦0–₦4,000 instead — a real
  // scale, plainly empty, which is what an empty month looks like.
  const axisMax = max > 0 ? max : measure === "money" ? 400_000 : 4;
  const ticks = niceTicks(axisMax);
  const domainTop = ticks[ticks.length - 1];

  // 90 day labels do not fit. Thin them rather than let them overlap.
  const tickGap = days <= 7 ? 0 : days <= 31 ? 2 : 9;

  const tone = HUE[measure];
  const todayIso = points[points.length - 1]?.iso;
  const empty = totals.orders === 0;

  const headline = measure === "money" ? formatKobo(totals.kobo) : String(totals.tickets);
  const caption =
    measure === "money"
      ? `taken in the last ${days} days`
      : `${totals.tickets === 1 ? "ticket" : "tickets"} sold in the last ${days} days`;

  const chip =
    "rounded-[3px] border-2 border-[var(--dl-line)] px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] transition-transform hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dl-ink)] focus-visible:ring-offset-2";
  const chipOn = "bg-[var(--dl-ink)] text-[var(--dl-panel)]";
  const label =
    "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";

  return (
    <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
      {/* Controls in one row above the plot, never floating over it. */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--dl-line)] p-5">
        <div>
          <p className={label}>Sales</p>
          <p
            className="mt-1.5 text-[31px] font-extrabold leading-none tracking-[-0.04em] [font-variant-numeric:tabular-nums]"
            style={{ color: tone }}
          >
            {headline}
          </p>
          <p className="mt-1.5 text-[12.5px] text-[var(--dl-ink-soft)]">{caption}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1.5" role="group" aria-label="What to show">
            {(["money", "tickets"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeasure(m)}
                aria-pressed={measure === m}
                className={`${chip} ${measure === m ? chipOn : ""}`}
              >
                {m === "money" ? "Money" : "Tickets"}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                aria-pressed={days === r}
                className={`${chip} ${days === r ? chipOn : ""}`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 pl-2">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 14, bottom: 0, left: 6 }}>
              <defs>
                {/* Fades out before the baseline so the fill never fights
                    the axis rule underneath it. */}
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={tone} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--dl-line-soft)"
                strokeDasharray="2 4"
                strokeOpacity={0.7}
              />
              <XAxis
                dataKey="iso"
                interval={tickGap}
                tickLine={false}
                axisLine={{ stroke: "var(--dl-line)", strokeWidth: 2 }}
                tick={{ fontSize: 10.5, fill: "var(--dl-ink-faint)" }}
                tickMargin={9}
                tickFormatter={(iso: string) => {
                  const p = points.find((q) => q.iso === iso);
                  if (!p) return "";
                  // The month name where the month turns — but "turns" has
                  // to mean the first tick DRAWN in that month, not the 1st
                  // of it. Over 90 days only every tenth tick is drawn, so
                  // keying off day === 1 skipped every month name and left
                  // an axis reading 14, 24, 4, 14 with no way to tell
                  // September from October.
                  return p.day <= tickGap + 1 || p === points[0]
                    ? p.month
                    : String(p.day);
                }}
              />
              <YAxis
                width={measure === "money" ? 52 : 34}
                ticks={ticks}
                domain={[0, domainTop]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10.5, fill: "var(--dl-ink-faint)" }}
                tickFormatter={(v: number) =>
                  measure === "money" ? compactNaira(v) : String(v)
                }
              />

              {/* Where today sits in the window — the line's right-hand edge. */}
              {todayIso && (
                <ReferenceLine
                  x={todayIso}
                  stroke="var(--dl-ink-faint)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}

              <Tooltip
                cursor={{ stroke: tone, strokeWidth: 1.5, strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as SalesPoint;
                  return (
                    <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 py-2 shadow-[3px_3px_0_var(--dl-line)]">
                      <p className={label}>{p.label}</p>
                      <p
                        className="mt-1 text-[16px] font-extrabold [font-variant-numeric:tabular-nums]"
                        style={{ color: tone }}
                      >
                        {measure === "money" ? formatKobo(p.kobo) : `${p.tickets}`}
                      </p>
                      <p className="text-[11.5px] text-[var(--dl-ink-soft)]">
                        {p.orders === 0
                          ? "nothing sold"
                          : measure === "money"
                            ? `${p.orders} ${p.orders === 1 ? "order" : "orders"}, ${p.tickets} ${p.tickets === 1 ? "ticket" : "tickets"}`
                            : `across ${p.orders} ${p.orders === 1 ? "order" : "orders"}`}
                      </p>
                    </div>
                  );
                }}
              />

              <Area
                // Straight segments, NOT a smoothed curve. Monotone drew a
                // bell shape between a day with nothing and a day with
                // ₦255,000, so the slopes either side crossed heights that
                // no day actually reached — the chart showed sales on
                // Tuesday because Wednesday was busy. Daily takings are
                // discrete; the line may only join points that exist.
                type="linear"
                dataKey={measure === "money" ? "kobo" : "tickets"}
                stroke={tone}
                strokeWidth={2.25}
                fill="url(#salesFill)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: tone,
                  stroke: "var(--dl-panel)",
                  strokeWidth: 2,
                }}
                isAnimationActive={!stillFrames}
                animationDuration={450}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {empty && (
          <p className="mt-3 pl-3 text-[12.5px] text-[var(--dl-ink-soft)]">
            Nothing sold in this window yet — the line lifts off the floor the
            moment somebody buys.
          </p>
        )}
      </div>

      {/* The same numbers, reachable without seeing the picture. */}
      <table className="sr-only">
        <caption>
          {measure === "money" ? "Money taken" : "Tickets sold"} per day, last {days} days
        </caption>
        <thead>
          <tr><th scope="col">Date</th><th scope="col">{measure === "money" ? "Taken" : "Tickets"}</th></tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.iso}>
              <th scope="row">{p.label}</th>
              <td>{measure === "money" ? formatKobo(p.kobo) : p.tickets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
