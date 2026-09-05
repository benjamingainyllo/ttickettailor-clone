import type { Kobo } from "@/lib/money";

/**
 * Turning a list of paid orders into the shape a dashboard shows.
 *
 * DELIBERATELY PURE, AND DELIBERATELY NOT server-only. The owner's
 * dashboard computes this on the server from every order on the
 * platform; an organiser's runs in their browser over their own orders.
 * Same arithmetic, same definitions of "this period" and "busiest day",
 * so the two screens can never quietly disagree about what a trend is.
 */

export interface Trend {
  value: number;
  previous: number;
  /** Null when there is no previous period to compare against. */
  changePct: number | null;
  direction: "up" | "down" | "flat";
}

export function trend(value: number, previous: number): Trend {
  if (previous <= 0) {
    return { value, previous, changePct: null, direction: value > 0 ? "up" : "flat" };
  }
  const pct = ((value - previous) / previous) * 100;
  return {
    value,
    previous,
    changePct: pct,
    // A percent under half a point is noise, not a direction.
    direction: Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down",
  };
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ShapeRow {
  status?: string | null;
  quantity?: number | string | null;
  gross_kobo?: number | string | null;
  platform_fee_kobo?: number | string | null;
  net_kobo?: number | string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

export interface DashboardShape {
  grossTrend: Trend;
  netTrend: Trend;
  ticketsTrend: Trend;
  ordersTrend: Trend;
  dailyGross: number[];
  dailyNet: number[];
  dailyTickets: number[];
  dailyOrders: number[];
  byWeekday: { day: string; tickets: number }[];
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Thirty days against the thirty before them.
 *
 * ONE PASS. Everything here comes out of a single loop over the rows —
 * both periods, four sparklines and the weekday split. A dashboard that
 * walks its data once per figure is a dashboard that gets slow exactly
 * when the organiser starts selling well.
 */
export function buildDashboardShape(
  rows: readonly ShapeRow[],
  now: Date = new Date()
): DashboardShape {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now);

  const gross = new Array(30).fill(0);
  const net = new Array(30).fill(0);
  const tix = new Array(30).fill(0);
  const ords = new Array(30).fill(0);
  const weekday = new Array(7).fill(0);

  let pGross = 0, pNet = 0, pTix = 0, pOrds = 0;

  for (const o of rows) {
    if (o.status && o.status !== "paid") continue;

    const stamp = o.paid_at ?? o.created_at;
    if (!stamp) continue;
    const when = new Date(stamp);
    if (Number.isNaN(when.getTime())) continue;

    const daysAgo = Math.round(
      (today.getTime() - startOfDay(when).getTime()) / 86400000
    );
    const qty = Math.max(1, Math.floor(num(o.quantity)) || 1);

    if (daysAgo >= 0 && daysAgo < 30) {
      const i = 29 - daysAgo;
      gross[i] += num(o.gross_kobo);
      net[i] += num(o.net_kobo);
      tix[i] += qty;
      ords[i] += 1;
      // JS weeks start Sunday; ours start Monday, like a working week.
      weekday[(when.getDay() + 6) % 7] += qty;
    } else if (daysAgo >= 30 && daysAgo < 60) {
      pGross += num(o.gross_kobo);
      pNet += num(o.net_kobo);
      pTix += qty;
      pOrds += 1;
    }
  }

  const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);

  return {
    grossTrend: trend(sum(gross), pGross),
    netTrend: trend(sum(net), pNet),
    ticketsTrend: trend(sum(tix), pTix),
    ordersTrend: trend(sum(ords), pOrds),
    dailyGross: gross,
    dailyNet: net,
    dailyTickets: tix,
    dailyOrders: ords,
    byWeekday: WEEKDAYS.map((day, i) => ({ day, tickets: weekday[i] })),
  };
}

/** How long until an event, said the way a person would say it. */
export function countdown(dateStr: string | null | undefined, now: Date = new Date()): string {
  if (!dateStr) return "date to be announced";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "date to be announced";

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000
  );

  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}
