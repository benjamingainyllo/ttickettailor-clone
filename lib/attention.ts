import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { raiseAttention } from "@/lib/disputes";

/**
 * The detectors.
 *
 * Each one asks the database a question with a known bad answer and puts
 * anything it finds in the queue. They are safe to run as often as you
 * like — every item carries a dedupe key, so a second run updates rather
 * than duplicates.
 *
 * WHY THIS RUNS ON PAGE LOAD RATHER THAN A CRON. There is no scheduler in
 * this deployment, and a problem nobody has looked at is not urgent by
 * definition — the moment somebody opens the admin area is exactly when
 * the queue needs to be current. If volume ever makes that too slow, the
 * same function moves behind a cron with no other change.
 */
export async function runDetectors(): Promise<void> {
  const admin = createAdminClient();
  const now = Date.now();

  try {
    // ── Paid, but no ticket ever issued ──────────────────────
    // Money taken and nothing delivered. This is both the worst
    // experience a buyer can have and the exact shape of a chargeback
    // we would lose, so it is the highest severity in the system.
    const halfHourAgo = new Date(now - 30 * 60 * 1000).toISOString();
    const { data: paidOrders } = await admin
      .from("orders")
      .select("id, reference, event_id, creator_id, gross_kobo, created_at, buyer_email")
      .eq("status", "paid")
      .eq("item_type", "event")
      .lt("created_at", halfHourAgo)
      .order("created_at", { ascending: false })
      .limit(200);

    const orderIds = (paidOrders ?? []).map((o: any) => o.id);
    const withTickets = new Set<string>();
    if (orderIds.length) {
      const { data: tickets } = await admin
        .from("tickets")
        .select("order_id")
        .in("order_id", orderIds);
      for (const t of tickets ?? []) withTickets.add(t.order_id);
    }

    for (const o of paidOrders ?? []) {
      if (withTickets.has(o.id)) continue;
      await raiseAttention({
        kind: "no_ticket_issued",
        severity: "critical",
        title: `Paid but no ticket issued — ${o.reference}`,
        detail: `${o.buyer_email ?? "A buyer"} paid over 30 minutes ago and settlement never finished.`,
        dedupeKey: `no_ticket:${o.id}`,
        subjectType: "order",
        subjectId: o.id,
        orderId: o.id,
        eventId: o.event_id,
        creatorId: o.creator_id,
      });
    }

    // ── Payment stuck pending ────────────────────────────────
    // A checkout that never resolved either way. Usually abandoned, but
    // a genuine stuck payment looks identical from here, so it is
    // surfaced rather than assumed.
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const { data: stuck } = await admin
      .from("orders")
      .select("id, reference, event_id, creator_id, created_at")
      .eq("status", "pending")
      .lt("created_at", twoHoursAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    for (const o of stuck ?? []) {
      await raiseAttention({
        kind: "payment_pending",
        severity: "medium",
        title: `Payment still pending — ${o.reference}`,
        detail: "Started over two hours ago and never completed or failed.",
        dedupeKey: `pending:${o.id}`,
        subjectType: "order",
        subjectId: o.id,
        orderId: o.id,
        eventId: o.event_id,
        creatorId: o.creator_id,
      });
    }

    // ── Failed refunds ───────────────────────────────────────
    // A buyer has been told their money is coming back and it isn't.
    const { data: badRefunds } = await admin
      .from("refunds")
      .select("id, order_id, event_id, creator_id, amount_kobo, failure_reason")
      .eq("status", "failed")
      .limit(50);

    for (const r of badRefunds ?? []) {
      await raiseAttention({
        kind: "refund_failed",
        severity: "high",
        title: "Refund failed",
        detail: r.failure_reason ?? "The provider rejected the refund.",
        dedupeKey: `refund_failed:${r.id}`,
        subjectType: "order",
        subjectId: r.order_id,
        orderId: r.order_id,
        eventId: r.event_id,
        creatorId: r.creator_id,
      });
    }

    // ── Failed settlements ───────────────────────────────────
    // Money that should have reached an organiser and didn't.
    const { data: badSettlements } = await admin
      .from("settlements")
      .select("id, creator_id, amount_kobo")
      .in("status", ["failed", "reversed"])
      .limit(50);

    for (const s of badSettlements ?? []) {
      await raiseAttention({
        kind: "settlement_failed",
        severity: "high",
        title: "Settlement failed or reversed",
        detail: "An organiser has not been paid what they were owed.",
        dedupeKey: `settlement:${s.id}`,
        subjectType: "organiser",
        subjectId: s.creator_id,
        creatorId: s.creator_id,
      });
    }

    // ── Selling with no bank connected ───────────────────────
    // Money arriving for somebody with nowhere to send it.
    const { data: liveEvents } = await admin
      .from("events")
      .select("id, title, creator_id, price_kobo")
      .eq("publish_status", "published")
      .gt("price_kobo", 0)
      .limit(200);

    const creatorIds = Array.from(
      new Set((liveEvents ?? []).map((e: any) => e.creator_id).filter(Boolean))
    );
    const banked = new Set<string>();
    if (creatorIds.length) {
      const { data: accounts } = await admin
        .from("payout_accounts")
        .select("creator_id, status, provider_subaccount_id")
        .in("creator_id", creatorIds);
      for (const a of accounts ?? []) {
        if (a.status === "active" && a.provider_subaccount_id) banked.add(a.creator_id);
      }
    }

    for (const e of liveEvents ?? []) {
      if (!e.creator_id || banked.has(e.creator_id)) continue;
      await raiseAttention({
        kind: "no_bank_selling",
        severity: "high",
        title: `Selling with no bank — ${e.title}`,
        detail: "A paid event is live for an organiser with no payout account.",
        dedupeKey: `no_bank:${e.id}`,
        subjectType: "event",
        subjectId: e.id,
        eventId: e.id,
        creatorId: e.creator_id,
      });
    }

    // ── The same ticket scanned more than once ───────────────
    // checked_in_at only records the FIRST scan, so a duplicate never
    // shows up as two timestamps. What it does show up as is more
    // tickets marked used at an event than were ever issued for it —
    // which means either a code got shared or the scanner double-fired.
    const { data: recentEvents } = await admin
      .from("events")
      .select("id, title, creator_id")
      .eq("publish_status", "published")
      .limit(100);

    for (const e of recentEvents ?? []) {
      const [{ count: issued }, { count: used }] = await Promise.all([
        admin.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", e.id),
        admin
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("event_id", e.id)
          .not("checked_in_at", "is", null),
      ]);
      if ((issued ?? 0) === 0 || (used ?? 0) <= (issued ?? 0)) continue;
      await raiseAttention({
        kind: "checkin_mismatch",
        severity: "high",
        title: `More scans than tickets — ${e.title}`,
        detail: `${used} tickets marked used but only ${issued} were ever issued. A code has been shared, or the scanner fired twice.`,
        dedupeKey: `checkin_mismatch:${e.id}`,
        subjectType: "event",
        subjectId: e.id,
        eventId: e.id,
        creatorId: e.creator_id,
      });
    }

    // ── Split groups sitting part-paid near their deadline ───
    const { data: openGroups } = await admin
      .from("split_groups")
      .select("id, code, seats, expires_at, event_id, creator_id")
      .eq("status", "open")
      .limit(50);

    for (const g of openGroups ?? []) {
      const left = new Date(g.expires_at).getTime() - now;
      if (left > 6 * 60 * 60 * 1000 || left < 0) continue;
      const { count: paidSeats } = await admin
        .from("split_participants")
        .select("id", { count: "exact", head: true })
        .eq("group_id", g.id)
        .eq("status", "paid");
      if ((paidSeats ?? 0) === 0 || (paidSeats ?? 0) >= g.seats) continue;
      await raiseAttention({
        kind: "split_nearly_expired",
        severity: "medium",
        title: `Split group ${g.code} won't fill in time`,
        detail: `${paidSeats} of ${g.seats} paid, and the deadline is hours away. Whoever paid will need refunding.`,
        dedupeKey: `split_soon:${g.id}`,
        subjectType: "event",
        subjectId: g.event_id,
        eventId: g.event_id,
        creatorId: g.creator_id,
      });
    }

    // ── A dispute deadline running out ───────────────────────
    const { data: openDisputes } = await admin
      .from("disputes")
      .select("id, provider_dispute_id, deadline_at, order_id, event_id, creator_id")
      .eq("status", "open")
      .limit(50);

    for (const d of openDisputes ?? []) {
      if (!d.deadline_at) continue;
      const left = new Date(d.deadline_at).getTime() - now;
      if (left > 4 * 60 * 60 * 1000) continue;
      await raiseAttention({
        kind: "dispute_deadline",
        severity: "critical",
        title:
          left <= 0
            ? "Dispute deadline has passed"
            : `Dispute deadline in under ${Math.max(1, Math.round(left / 3600000))}h`,
        detail: "Submit evidence or it is decided against us by default.",
        dedupeKey: `dispute_deadline:${d.id}`,
        subjectType: "order",
        subjectId: d.order_id ?? d.provider_dispute_id,
        orderId: d.order_id,
        eventId: d.event_id,
        creatorId: d.creator_id,
      });
    }
  } catch (error) {
    // Detection failing must never take the admin area down with it.
    console.error("Attention detectors failed", error);
  }
}
