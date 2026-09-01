import type { Kobo } from "@/lib/money";

/**
 * Turning a pile of orders into one point per day.
 *
 * WHY THIS IS ITS OWN FILE. The chart is a rendering problem; which day a
 * sale belongs to is an arithmetic one, and the arithmetic is the part that
 * can be wrong without looking wrong. Kept separate so it can be reasoned
 * about — and tested — without a browser.
 *
 * THE DAY BOUNDARY IS THE VIEWER'S, NOT UTC'S. A sale at 11pm in Lagos is
 * still today's sale to the organiser looking at it. Bucketing on
 * toISOString() would push it into tomorrow for anyone east of Greenwich,
 * which is everybody we sell to. So the key is built from local calendar
 * parts.
 *
 * WE COUNT WHEN THE MONEY ARRIVED, not when the order was started. An
 * abandoned checkout resumed the next morning belongs to the morning it was
 * paid, which is the day the organiser saw the money.
 */

export interface SalesOrderRow {
  status: string | null;
  quantity: number | null;
  gross_kobo: number | string | null;
  net_kobo: number | string | null;
  paid_at: string | null;
  created_at: string | null;
}

export interface SalesPoint {
  /** Local calendar date, YYYY-MM-DD. The bucket key. */
  iso: string;
  /** Day of the month — the x axis tick. */
  day: number;
  /** Short month, shown on the 1st so a two-month window reads correctly. */
  month: string;
  /** "12 Aug" — the tooltip heading. */
  label: string;
  /** Money taken that day, in kobo. Never a float, never naira. */
  kobo: Kobo;
  /** Tickets, not orders — one order can be six tickets. */
  tickets: number;
  orders: number;
  isToday: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Local calendar date as YYYY-MM-DD. Deliberately not toISOString(). */
function localIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Postgres bigints arrive as strings often enough to be worth guarding. */
function toNumber(value: number | string | null): number {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? (n as number) : 0;
}

/**
 * One point per day for the last `days` days, ending today.
 *
 * Days with no sales are present and zero rather than absent — a gap in a
 * line chart reads as "we lost the data", a zero reads as "nobody bought
 * anything", and only one of those is true.
 */
export function buildSalesSeries(
  orders: readonly SalesOrderRow[],
  days = 30,
  now: Date = new Date()
): SalesPoint[] {
  const span = Math.max(1, Math.floor(days));
  const todayIso = localIso(now);

  const points: SalesPoint[] = [];
  const index = new Map<string, SalesPoint>();

  for (let back = span - 1; back >= 0; back--) {
    // Stepping the date number rather than subtracting milliseconds: only
    // the former survives a daylight-saving change, and while Nigeria has
    // none, the browser doing the rendering might.
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const iso = localIso(d);
    const point: SalesPoint = {
      iso,
      day: d.getDate(),
      month: MONTHS[d.getMonth()],
      label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      kobo: 0,
      tickets: 0,
      orders: 0,
      isToday: iso === todayIso,
    };
    points.push(point);
    index.set(iso, point);
  }

  for (const order of orders) {
    if (order.status !== "paid") continue;

    const stamp = order.paid_at ?? order.created_at;
    if (!stamp) continue;

    const when = new Date(stamp);
    if (Number.isNaN(when.getTime())) continue;

    const bucket = index.get(localIso(when));
    if (!bucket) continue; // Older than the window. Not an error.

    bucket.kobo += toNumber(order.gross_kobo);
    bucket.tickets += Math.max(1, Math.floor(toNumber(order.quantity)) || 1);
    bucket.orders += 1;
  }

  return points;
}

/** Totals for the window, so the headline and the line can never disagree. */
export function summariseSeries(points: readonly SalesPoint[]) {
  return points.reduce(
    (acc, p) => ({
      kobo: acc.kobo + p.kobo,
      tickets: acc.tickets + p.tickets,
      orders: acc.orders + p.orders,
    }),
    { kobo: 0, tickets: 0, orders: 0 }
  );
}

/**
 * Axis ticks that land on round numbers.
 *
 * An all-zero series is the normal state for a new organiser, and asking a
 * chart library for the domain of nothing gives you either 0–0 (a line
 * hidden under the axis) or something arbitrary. So an empty window gets a
 * deliberate 0–4, which is what an empty chart should look like: a real
 * grid with a flat line on the floor.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) {
    return Array.from({ length: count + 1 }, (_, i) => i);
  }

  const rough = max / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalised = rough / magnitude;

  // Never below 1. Both measures here are whole things — kobo and tickets —
  // and a fractional step on a max of 1 rounds to [0, 0, 1]: a duplicate
  // label and a gridline drawn on top of the axis.
  const step = Math.max(
    1,
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) *
      magnitude
  );

  // Run until the top tick is at or above the max, NOT until it is near it.
  // Stopping early puts the highest point above the last gridline and the
  // line clips out of the plot — at max 23 with a step of 10, the old
  // condition stopped at 20 and the best sales day of the month vanished
  // off the top of the chart.
  const ticks: number[] = [];
  for (let v = 0; ticks.length < 24; v += step) {
    ticks.push(Math.round(v));
    if (v >= max) break;
  }
  return ticks;
}
