import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface TopOrganiser {
  name: string;
  handle: string | null;
  feesKobo: number;
  grossKobo: number;
  orders: number;
}

export interface RiskEvent {
  title: string;
  organiser: string;
  detail: string;
  grossKobo: number;
}

export interface PlatformStats {
  /** What Paylance earned. The reason this screen exists. */
  feesKobo: number;
  feesThisMonthKobo: number;
  /** Everything that moved through the platform — a bigger, different number. */
  grossKobo: number;
  grossThisMonthKobo: number;
  paidOrders: number;
  ticketsSold: number;
  ticketsFree: number;

  organisers: number;
  eventsPublished: number;
  eventsDraft: number;

  /** Paid, but never settled: somebody's money with no ticket behind it. */
  stuckOrders: number;
  failedOrders: number;

  /**
   * Money taken with nowhere for it to land. The strongest single signal
   * that something is wrong, because a real organiser connects their bank
   * before they start selling — publishing already requires it.
   */
  paidEventsWithoutBank: RiskEvent[];

  /**
   * Sold well, nobody scanned in. Either the organiser isn't using the door
   * scanner, or the night did not happen. Only counted after the event has
   * been and gone, so it can't flag something that simply hasn't started.
   */
  soldButNobodyCameIn: RiskEvent[];

  topOrganisers: TopOrganiser[];
}

/** Older than this and still pending is not "in progress". */
const STUCK_AFTER_MINUTES = 30;
/** Below this, an empty door is noise rather than a signal. */
const NO_SHOW_MIN_TICKETS = 10;

/**
 * Every number the owner's dashboard shows, in one pass.
 *
 * Runs with the service key, so it MUST only be called behind
 * isPlatformAdmin(). Server-only, which makes getting that wrong hard.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const admin = createAdminClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const stuckBefore = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [paid, profiles, events, stuck, failed, ticketRows, payoutAccounts] =
    await Promise.all([
      admin
        .from("orders")
        .select("creator_id, event_id, gross_kobo, platform_fee_kobo, paid_at, created_at")
        .eq("status", "paid"),
      admin.from("profiles").select("id, first_name, last_name, handle, box_office_name"),
      admin.from("events").select("id, creator_id, title, publish_status, price_kobo, date"),
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", stuckBefore),
      admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("tickets").select("event_id, checked_in_at, price_kobo"),
      admin.from("payout_accounts").select("creator_id").eq("status", "active"),
    ]);

  const paidRows = paid.data ?? [];
  const profileRows = profiles.data ?? [];
  const eventRows = events.data ?? [];
  const tickets = ticketRows.data ?? [];
  const banked = new Set((payoutAccounts.data ?? []).map((a) => a.creator_id));

  const sum = (rows: { [k: string]: unknown }[], key: string) =>
    rows.reduce((total, r) => total + Number(r[key] ?? 0), 0);

  const thisMonth = paidRows.filter(
    (o) => new Date(o.paid_at ?? o.created_at) >= monthStart
  );

  const nameFor = (id: string) => {
    const p = profileRows.find((r) => r.id === id);
    return (
      p?.box_office_name ||
      [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
      p?.handle ||
      "Unknown"
    );
  };

  // Fees by organiser, then the ten that matter.
  const byCreator = new Map<string, { feesKobo: number; grossKobo: number; orders: number }>();
  for (const o of paidRows) {
    const current = byCreator.get(o.creator_id) ?? { feesKobo: 0, grossKobo: 0, orders: 0 };
    current.feesKobo += Number(o.platform_fee_kobo ?? 0);
    current.grossKobo += Number(o.gross_kobo ?? 0);
    current.orders += 1;
    byCreator.set(o.creator_id, current);
  }

  const topOrganisers: TopOrganiser[] = Array.from(byCreator.entries())
    .map(([id, v]) => ({
      name: nameFor(id),
      handle: profileRows.find((r) => r.id === id)?.handle ?? null,
      ...v,
    }))
    .sort((a, b) => b.feesKobo - a.feesKobo)
    .slice(0, 10);

  const published = eventRows.filter((e) => e.publish_status === "published");

  const grossForEvent = (eventId: string) =>
    paidRows.filter((o) => o.event_id === eventId).reduce((t, o) => t + Number(o.gross_kobo ?? 0), 0);

  const paidEventsWithoutBank: RiskEvent[] = published
    .filter((e) => Number(e.price_kobo ?? 0) > 0 && !banked.has(e.creator_id))
    .map((e) => ({
      title: e.title,
      organiser: nameFor(e.creator_id),
      detail: "Charging money with no bank account connected",
      grossKobo: grossForEvent(e.id),
    }))
    .sort((a, b) => b.grossKobo - a.grossKobo);

  const soldButNobodyCameIn: RiskEvent[] = published
    .filter((e) => e.date && e.date < today)
    .map((e) => {
      const forEvent = tickets.filter((t) => t.event_id === e.id);
      const admitted = forEvent.filter((t) => t.checked_in_at).length;
      return { event: e, issued: forEvent.length, admitted };
    })
    .filter((r) => r.issued >= NO_SHOW_MIN_TICKETS && r.admitted === 0)
    .map((r) => ({
      title: r.event.title,
      organiser: nameFor(r.event.creator_id),
      detail: `${r.issued} tickets sold, nobody scanned at the door`,
      grossKobo: grossForEvent(r.event.id),
    }))
    .sort((a, b) => b.grossKobo - a.grossKobo);

  return {
    feesKobo: sum(paidRows, "platform_fee_kobo"),
    feesThisMonthKobo: sum(thisMonth, "platform_fee_kobo"),
    grossKobo: sum(paidRows, "gross_kobo"),
    grossThisMonthKobo: sum(thisMonth, "gross_kobo"),
    paidOrders: paidRows.length,
    ticketsSold: tickets.length,
    ticketsFree: tickets.filter((t) => Number(t.price_kobo ?? 0) === 0).length,

    organisers: profileRows.length,
    eventsPublished: published.length,
    eventsDraft: eventRows.length - published.length,

    stuckOrders: stuck.count ?? 0,
    failedOrders: failed.count ?? 0,

    paidEventsWithoutBank,
    soldButNobodyCameIn,
    topOrganisers,
  };
}
