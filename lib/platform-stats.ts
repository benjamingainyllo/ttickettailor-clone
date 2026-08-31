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

  /**
   * FREE IS COUNTED SEPARATELY, EVERYWHERE ON THIS SCREEN.
   *
   * A free registration settles to status 'paid' like any other order —
   * that is how a ticket gets issued for it. So "orders where status =
   * paid" silently mixes money with no money, and every count built on it
   * flatters itself: 40 free RSVPs read as 40 paid orders and the take
   * rate looks like a rounding error.
   *
   * Free events are worth having. They spin the loop, they cost the
   * organiser nothing, and they are how a lot of people meet the product.
   * They are not revenue and must never be added to it, so the split is
   * made here once rather than left for each caller to remember.
   */
  paidOrders: number;
  freeRegistrations: number;
  ticketsPaid: number;
  ticketsFree: number;

  organisers: number;
  eventsPublishedPaid: number;
  eventsPublishedFree: number;
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

  const [paid, profiles, events, stuck, failed, ticketRows, payoutAccounts, tierRows] =
    await Promise.all([
      admin
        .from("orders")
        .select("id, creator_id, event_id, gross_kobo, platform_fee_kobo, paid_at, created_at")
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
      admin.from("ticket_types").select("event_id, price_kobo"),
    ]);

  /**
   * Test sales are dropped before anything is counted.
   *
   * Asked as their own queries rather than selected alongside everything
   * else, because events.is_demo and orders.is_demo only exist once
   * setup.sql has been run — and folding the column into the main selects
   * would make this entire dashboard read zero on a database that hasn't
   * caught up yet. On failure both sets come back empty, nothing is
   * excluded, and the numbers are exactly what they were before test
   * sales existed.
   */
  const [demoEvents, demoOrders] = await Promise.all([
    admin.from("events").select("id").eq("is_demo", true),
    admin.from("orders").select("id").eq("is_demo", true),
  ]);
  const demoEventIds = new Set((demoEvents.data ?? []).map((e) => e.id));
  const demoOrderIds = new Set((demoOrders.data ?? []).map((o) => o.id));

  const settledRows = (paid.data ?? []).filter(
    (o) => !demoOrderIds.has((o as { id?: string }).id ?? "")
  );

  // The split the whole screen depends on. A settled order with nothing on
  // it is a registration, not a sale, and it is kept out of every revenue
  // figure below by never entering this array in the first place.
  const paidRows = settledRows.filter((o) => Number(o.gross_kobo ?? 0) > 0);
  const freeRows = settledRows.filter((o) => Number(o.gross_kobo ?? 0) === 0);

  const profileRows = profiles.data ?? [];
  const eventRows = (events.data ?? []).filter((e) => !demoEventIds.has(e.id));
  const tickets = (ticketRows.data ?? []).filter(
    (t) => !demoEventIds.has(t.event_id)
  );
  const banked = new Set((payoutAccounts.data ?? []).map((a) => a.creator_id));

  /**
   * Which events actually charge for something.
   *
   * An event sells ticket TYPES; events.price_kobo is only the headline
   * price captured when it was created, and it does not follow a tier
   * that is added or repriced afterwards. Classifying off it alone files
   * a ₦20,000 conference under "free" the moment its price moved. So the
   * tiers decide, and the headline price is the fallback for an event
   * that somehow has none.
   */
  const paidEventIds = new Set(
    (tierRows.data ?? [])
      .filter((t) => Number(t.price_kobo ?? 0) > 0)
      .map((t) => t.event_id)
  );
  const chargesMoney = (e: { id: string; price_kobo?: unknown }) =>
    paidEventIds.has(e.id) || Number(e.price_kobo ?? 0) > 0;

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
  const publishedPaid = published.filter(chargesMoney);

  const grossForEvent = (eventId: string) =>
    paidRows.filter((o) => o.event_id === eventId).reduce((t, o) => t + Number(o.gross_kobo ?? 0), 0);

  const paidEventsWithoutBank: RiskEvent[] = publishedPaid
    .filter((e) => !banked.has(e.creator_id))
    .map((e) => ({
      title: e.title,
      organiser: nameFor(e.creator_id),
      detail: "Charging money with no bank account connected",
      grossKobo: grossForEvent(e.id),
    }))
    .sort((a, b) => b.grossKobo - a.grossKobo);

  // Paid events only. An empty door at a free event is a no-show, not a
  // fraud signal — nobody's money is missing, so flagging it would only
  // train the eye to scroll past this list.
  const soldButNobodyCameIn: RiskEvent[] = publishedPaid
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
    freeRegistrations: freeRows.length,
    ticketsPaid: tickets.filter((t) => Number(t.price_kobo ?? 0) > 0).length,
    ticketsFree: tickets.filter((t) => Number(t.price_kobo ?? 0) === 0).length,

    organisers: profileRows.length,
    eventsPublishedPaid: publishedPaid.length,
    eventsPublishedFree: published.length - publishedPaid.length,
    eventsDraft: eventRows.length - published.length,

    stuckOrders: stuck.count ?? 0,
    failedOrders: failed.count ?? 0,

    paidEventsWithoutBank,
    soldButNobodyCameIn,
    topOrganisers,
  };
}
