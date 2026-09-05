import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Kobo } from "@/lib/money";

/**
 * Every read the admin screens make.
 *
 * ONE FILE, ON PURPOSE. These queries use the service key, which sees past
 * every row-level policy in the database — every organiser's revenue and
 * every buyer's phone number. Keeping them together means the blast radius
 * of that key is one file you can read in a sitting, rather than a call
 * scattered through a dozen pages.
 *
 * `import "server-only"` makes importing any of this into a client
 * component a build error rather than a data leak.
 *
 * PAGINATION IS NOT OPTIONAL. Every list here takes a page and a size and
 * returns a total. A platform admin screen that loads every row works fine
 * for the first six months and then takes the page down.
 */

export const PAGE_SIZE = 25;

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

function toNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/** Postgres full-text is overkill here; escape the wildcards and move on. */
function like(term: string): string {
  return `%${term.trim().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
}

// ── Events ──────────────────────────────────────────────────────

export interface AdminEventRow {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  organiserId: string | null;
  organiserName: string;
  publishStatus: string;
  adminState: string;
  createdAt: string;
  ticketsSold: number;
  grossKobo: Kobo;
  feesKobo: Kobo;
}

export async function listEvents(opts: {
  page?: number;
  q?: string;
  state?: string;
}): Promise<Page<AdminEventRow>> {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = admin
    .from("events")
    .select("id, title, date, location, creator_id, publish_status, admin_state, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (opts.q?.trim()) query = query.ilike("title", like(opts.q));
  if (opts.state === "draft") query = query.eq("publish_status", "draft");
  else if (opts.state === "live") query = query.eq("publish_status", "published");
  else if (opts.state && opts.state !== "all") query = query.eq("admin_state", opts.state);

  const { data, count } = await query;
  const rows = data ?? [];
  const ids = rows.map((e: any) => e.id);

  // Totals are fetched for the page being shown, not for every event on
  // the platform. Twenty-five events is two small queries; ten thousand
  // would be a timeout.
  const [orders, creators] = await Promise.all([
    ids.length
      ? admin
          .from("orders")
          .select("event_id, quantity, gross_kobo, platform_fee_kobo, status")
          .in("event_id", ids)
          .eq("status", "paid")
      : Promise.resolve({ data: [] as any[] }),
    (async () => {
      const creatorIds = Array.from(
        new Set(rows.map((e: any) => e.creator_id).filter(Boolean))
      );
      if (!creatorIds.length) return { data: [] as any[] };
      return admin
        .from("profiles")
        .select("id, first_name, last_name, handle, box_office_name")
        .in("id", creatorIds);
    })(),
  ]);

  const byEvent = new Map<string, { sold: number; gross: number; fees: number }>();
  for (const o of (orders as any).data ?? []) {
    const cur = byEvent.get(o.event_id) ?? { sold: 0, gross: 0, fees: 0 };
    cur.sold += Math.max(1, toNum(o.quantity) || 1);
    cur.gross += toNum(o.gross_kobo);
    cur.fees += toNum(o.platform_fee_kobo);
    byEvent.set(o.event_id, cur);
  }

  const byCreator = new Map<string, any>();
  for (const p of (creators as any).data ?? []) byCreator.set(p.id, p);

  return {
    rows: rows.map((e: any) => {
      const t = byEvent.get(e.id) ?? { sold: 0, gross: 0, fees: 0 };
      const p = e.creator_id ? byCreator.get(e.creator_id) : null;
      return {
        id: e.id,
        title: e.title,
        date: e.date,
        location: e.location,
        organiserId: e.creator_id,
        organiserName: organiserName(p),
        publishStatus: e.publish_status,
        adminState: e.admin_state ?? "ok",
        createdAt: e.created_at,
        ticketsSold: t.sold,
        grossKobo: t.gross,
        feesKobo: t.fees,
      };
    }),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export function organiserName(p: any): string {
  if (!p) return "Unknown";
  return (
    p.box_office_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.handle ||
    "Unnamed"
  );
}

export async function getEventDetail(id: string) {
  const admin = createAdminClient();

  const { data: event } = await admin.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) return null;

  const [profile, tiers, orders, tickets, cohosts, notes] = await Promise.all([
    event.creator_id
      ? admin
          .from("profiles")
          .select("id, first_name, last_name, handle, box_office_name, account_state")
          .eq("id", event.creator_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("ticket_types")
      .select("id, name, price_kobo, quantity, sold_count, status")
      .eq("event_id", id)
      .order("sort_order"),
    admin
      .from("orders")
      .select(
        "id, reference, buyer_name, buyer_email, quantity, gross_kobo, platform_fee_kobo, provider_fee_kobo, net_kobo, status, payment_channel, created_at"
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    admin.from("tickets").select("id, code, status, checked_in_at, holder_email").eq("event_id", id).limit(500),
    admin.from("event_cohosts").select("name, handle").eq("event_id", id).order("sort_order"),
    admin
      .from("admin_notes")
      .select("body, author_email, created_at")
      .eq("subject_type", "event")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
  ]).catch(() => [{ data: null }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }] as any);

  const orderRows = (orders as any).data ?? [];
  const paid = orderRows.filter((o: any) => o.status === "paid");
  const ticketRows = (tickets as any).data ?? [];

  return {
    event,
    organiser: (profile as any).data ?? null,
    organiserName: organiserName((profile as any).data),
    tiers: (tiers as any).data ?? [],
    orders: orderRows,
    tickets: ticketRows,
    cohosts: (cohosts as any).data ?? [],
    notes: (notes as any).data ?? [],
    money: {
      grossKobo: paid.reduce((s: number, o: any) => s + toNum(o.gross_kobo), 0),
      feesKobo: paid.reduce((s: number, o: any) => s + toNum(o.platform_fee_kobo), 0),
      processingKobo: paid.reduce((s: number, o: any) => s + toNum(o.provider_fee_kobo), 0),
      netKobo: paid.reduce((s: number, o: any) => s + toNum(o.net_kobo), 0),
      paidOrders: paid.length,
      ticketsSold: paid.reduce((s: number, o: any) => s + Math.max(1, toNum(o.quantity) || 1), 0),
      ticketsIssued: ticketRows.length,
      checkedIn: ticketRows.filter((t: any) => t.checked_in_at).length,
      refunded: orderRows.filter((o: any) => o.status === "refunded").length,
    },
  };
}

// ── Organisers ──────────────────────────────────────────────────

export interface AdminOrganiserRow {
  id: string;
  name: string;
  handle: string | null;
  accountState: string;
  createdAt: string | null;
  events: number;
  ticketsSold: number;
  grossKobo: Kobo;
  feesKobo: Kobo;
  bankConnected: boolean;
}

export async function listOrganisers(opts: {
  page?: number;
  q?: string;
  state?: string;
}): Promise<Page<AdminOrganiserRow>> {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = admin
    .from("profiles")
    .select("id, first_name, last_name, handle, box_office_name, account_state, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (opts.q?.trim()) {
    const t = like(opts.q);
    query = query.or(
      `first_name.ilike.${t},last_name.ilike.${t},handle.ilike.${t},box_office_name.ilike.${t}`
    );
  }
  if (opts.state && opts.state !== "all") query = query.eq("account_state", opts.state);

  const { data, count } = await query;
  const rows = data ?? [];
  const ids = rows.map((p: any) => p.id);

  const [orders, events, banks] = await Promise.all([
    ids.length
      ? admin
          .from("orders")
          .select("creator_id, quantity, gross_kobo, platform_fee_kobo")
          .in("creator_id", ids)
          .eq("status", "paid")
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? admin.from("events").select("id, creator_id").in("creator_id", ids)
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? admin
          .from("payout_accounts")
          .select("creator_id, status, provider_subaccount_id")
          .in("creator_id", ids)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const money = new Map<string, { sold: number; gross: number; fees: number }>();
  for (const o of (orders as any).data ?? []) {
    const cur = money.get(o.creator_id) ?? { sold: 0, gross: 0, fees: 0 };
    cur.sold += Math.max(1, toNum(o.quantity) || 1);
    cur.gross += toNum(o.gross_kobo);
    cur.fees += toNum(o.platform_fee_kobo);
    money.set(o.creator_id, cur);
  }
  const eventCount = new Map<string, number>();
  for (const e of (events as any).data ?? [])
    eventCount.set(e.creator_id, (eventCount.get(e.creator_id) ?? 0) + 1);
  const banked = new Set(
    ((banks as any).data ?? [])
      .filter((b: any) => b.status === "active" && b.provider_subaccount_id)
      .map((b: any) => b.creator_id)
  );

  return {
    rows: rows.map((p: any) => {
      const m = money.get(p.id) ?? { sold: 0, gross: 0, fees: 0 };
      return {
        id: p.id,
        name: organiserName(p),
        handle: p.handle ?? null,
        accountState: p.account_state ?? "ok",
        createdAt: p.created_at ?? null,
        events: eventCount.get(p.id) ?? 0,
        ticketsSold: m.sold,
        grossKobo: m.gross,
        feesKobo: m.fees,
        bankConnected: banked.has(p.id),
      };
    }),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getOrganiserDetail(id: string) {
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;

  const [events, orders, bank, settlements, notes, audit] = await Promise.all([
    admin
      .from("events")
      .select("id, title, date, publish_status, admin_state, created_at")
      .eq("creator_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("orders")
      .select("id, reference, gross_kobo, platform_fee_kobo, net_kobo, status, quantity, created_at")
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("payout_accounts")
      .select("status, bank_name, account_name, account_number_last4, provider_subaccount_id")
      .eq("creator_id", id)
      .maybeSingle(),
    admin
      .from("settlements")
      .select("amount_kobo, status, settled_at, provider_settlement_id")
      .eq("creator_id", id)
      .order("settled_at", { ascending: false })
      .limit(50),
    admin
      .from("admin_notes")
      .select("body, author_email, created_at")
      .eq("subject_type", "organiser")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("admin_audit_log")
      .select("action, admin_email, created_at, previous_value, new_value, reason")
      .eq("subject_type", "organiser")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]).catch(
    () =>
      [{ data: [] }, { data: [] }, { data: null }, { data: [] }, { data: [] }, { data: [] }] as any
  );

  const orderRows = (orders as any).data ?? [];
  const paid = orderRows.filter((o: any) => o.status === "paid");
  const refunded = orderRows.filter((o: any) => o.status === "refunded");

  return {
    profile,
    name: organiserName(profile),
    events: (events as any).data ?? [],
    orders: orderRows,
    bank: (bank as any).data ?? null,
    settlements: (settlements as any).data ?? [],
    notes: (notes as any).data ?? [],
    audit: (audit as any).data ?? [],
    money: {
      grossKobo: paid.reduce((s: number, o: any) => s + toNum(o.gross_kobo), 0),
      feesKobo: paid.reduce((s: number, o: any) => s + toNum(o.platform_fee_kobo), 0),
      netKobo: paid.reduce((s: number, o: any) => s + toNum(o.net_kobo), 0),
      paidOrders: paid.length,
      ticketsSold: paid.reduce((s: number, o: any) => s + Math.max(1, toNum(o.quantity) || 1), 0),
      refundedOrders: refunded.length,
      // The rate that matters for risk, expressed against paid orders
      // rather than all orders — an abandoned checkout is not a refund.
      refundRate: paid.length > 0 ? refunded.length / (paid.length + refunded.length) : 0,
    },
  };
}

// ── Customers ───────────────────────────────────────────────────

export interface AdminCustomerRow {
  email: string;
  name: string | null;
  phone: string | null;
  orders: number;
  ticketsBought: number;
  spentKobo: Kobo;
  refunds: number;
  lastOrderAt: string | null;
}

/**
 * Buyers, assembled from orders rather than from a customers table.
 *
 * There isn't one, and inventing one would mean a second source of truth
 * for who bought what. `audience` exists but is per-organiser and only
 * carries an email, so it cannot answer "everything this person has ever
 * done across the platform" — which is the only question this screen is
 * for.
 *
 * SEARCH IS REQUIRED, not optional, and that is a deliberate limit rather
 * than a missing feature: paging blindly through every buyer's phone
 * number is not something an admin should be able to do by accident.
 */
export async function findCustomers(q: string): Promise<AdminCustomerRow[]> {
  const term = q.trim();
  if (term.length < 2) return [];

  const admin = createAdminClient();
  const t = like(term);

  const { data } = await admin
    .from("orders")
    .select(
      "buyer_email, buyer_name, buyer_phone, quantity, gross_kobo, status, created_at, reference"
    )
    .or(
      `buyer_email.ilike.${t},buyer_name.ilike.${t},buyer_phone.ilike.${t},reference.ilike.${t}`
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const byEmail = new Map<string, AdminCustomerRow>();
  for (const o of data ?? []) {
    const email = (o.buyer_email ?? "").trim().toLowerCase();
    if (!email) continue;
    const cur =
      byEmail.get(email) ??
      ({
        email,
        name: o.buyer_name ?? null,
        phone: o.buyer_phone ?? null,
        orders: 0,
        ticketsBought: 0,
        spentKobo: 0,
        refunds: 0,
        lastOrderAt: null,
      } as AdminCustomerRow);

    cur.name = cur.name ?? o.buyer_name ?? null;
    cur.phone = cur.phone ?? o.buyer_phone ?? null;
    if (o.status === "paid") {
      cur.orders += 1;
      cur.ticketsBought += Math.max(1, toNum(o.quantity) || 1);
      cur.spentKobo += toNum(o.gross_kobo);
    }
    if (o.status === "refunded") cur.refunds += 1;
    if (!cur.lastOrderAt || o.created_at > cur.lastOrderAt) cur.lastOrderAt = o.created_at;
    byEmail.set(email, cur);
  }

  return Array.from(byEmail.values()).sort((a, b) => b.spentKobo - a.spentKobo);
}

export async function getCustomerDetail(email: string) {
  const admin = createAdminClient();
  const clean = email.trim().toLowerCase();

  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, reference, event_id, item_title, quantity, gross_kobo, status, payment_channel, created_at, buyer_name, buyer_phone"
    )
    .ilike("buyer_email", clean)
    .order("created_at", { ascending: false });

  const rows = orders ?? [];
  const eventIds = Array.from(new Set(rows.map((o: any) => o.event_id).filter(Boolean)));

  const [events, tickets] = await Promise.all([
    eventIds.length
      ? admin.from("events").select("id, title, date").in("id", eventIds)
      : Promise.resolve({ data: [] as any[] }),
    admin
      .from("tickets")
      .select("id, code, status, checked_in_at, event_id, order_id")
      .ilike("holder_email", clean)
      .limit(200),
  ]);

  const eventById = new Map<string, any>();
  for (const e of (events as any).data ?? []) eventById.set(e.id, e);

  const paid = rows.filter((o: any) => o.status === "paid");

  return {
    email: clean,
    name: rows.find((o: any) => o.buyer_name)?.buyer_name ?? null,
    phone: rows.find((o: any) => o.buyer_phone)?.buyer_phone ?? null,
    orders: rows.map((o: any) => ({ ...o, event: eventById.get(o.event_id) ?? null })),
    tickets: (tickets as any).data ?? [],
    spentKobo: paid.reduce((s: number, o: any) => s + toNum(o.gross_kobo), 0),
    paidOrders: paid.length,
    refunds: rows.filter((o: any) => o.status === "refunded").length,
    events: Array.from(eventById.values()),
  };
}

// ── Orders, tickets, payments ───────────────────────────────────

export interface AdminOrderRow {
  id: string;
  reference: string;
  buyerName: string | null;
  buyerEmail: string | null;
  eventId: string | null;
  eventTitle: string;
  organiserId: string | null;
  organiserName: string;
  grossKobo: Kobo;
  feeKobo: Kobo;
  status: string;
  channel: string | null;
  createdAt: string;
  quantity: number;
}

export async function listOrders(opts: {
  page?: number;
  q?: string;
  status?: string;
  eventId?: string;
}): Promise<Page<AdminOrderRow>> {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = admin
    .from("orders")
    .select(
      "id, reference, buyer_name, buyer_email, event_id, creator_id, quantity, gross_kobo, platform_fee_kobo, status, payment_channel, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (opts.q?.trim()) {
    const t = like(opts.q);
    query = query.or(`reference.ilike.${t},buyer_email.ilike.${t},buyer_name.ilike.${t}`);
  }
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);
  if (opts.eventId) query = query.eq("event_id", opts.eventId);

  const { data, count } = await query;
  const rows = data ?? [];

  const eventIds = Array.from(new Set(rows.map((o: any) => o.event_id).filter(Boolean)));
  const creatorIds = Array.from(new Set(rows.map((o: any) => o.creator_id).filter(Boolean)));

  const [events, profiles] = await Promise.all([
    eventIds.length
      ? admin.from("events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: [] as any[] }),
    creatorIds.length
      ? admin
          .from("profiles")
          .select("id, first_name, last_name, handle, box_office_name")
          .in("id", creatorIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const eventById = new Map<string, any>();
  for (const e of (events as any).data ?? []) eventById.set(e.id, e);
  const profileById = new Map<string, any>();
  for (const p of (profiles as any).data ?? []) profileById.set(p.id, p);

  return {
    rows: rows.map((o: any) => ({
      id: o.id,
      reference: o.reference,
      buyerName: o.buyer_name,
      buyerEmail: o.buyer_email,
      eventId: o.event_id,
      eventTitle: eventById.get(o.event_id)?.title ?? "—",
      organiserId: o.creator_id,
      organiserName: organiserName(profileById.get(o.creator_id)),
      grossKobo: toNum(o.gross_kobo),
      feeKobo: toNum(o.platform_fee_kobo),
      status: o.status,
      channel: o.payment_channel,
      createdAt: o.created_at,
      quantity: Math.max(1, toNum(o.quantity) || 1),
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

/** One order, end to end: buyer, payment, tickets, refunds, disputes. */
export async function getOrderDetail(id: string) {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;

  const [event, profile, tickets, refunds, disputes, notes] = await Promise.all([
    order.event_id
      ? admin.from("events").select("id, title, date, location").eq("id", order.event_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.creator_id
      ? admin
          .from("profiles")
          .select("id, first_name, last_name, handle, box_office_name")
          .eq("id", order.creator_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("tickets")
      .select("id, code, status, checked_in_at, holder_email, created_at")
      .eq("order_id", id),
    admin
      .from("refunds")
      .select("id, amount_kobo, status, reason, failure_reason, created_at, completed_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("disputes")
      .select("id, provider_dispute_id, status, amount_kobo, reason, deadline_at, created_at")
      .eq("order_id", id),
    admin
      .from("admin_notes")
      .select("body, author_email, created_at")
      .eq("subject_type", "order")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
  ]).catch(
    () => [{ data: null }, { data: null }, { data: [] }, { data: [] }, { data: [] }, { data: [] }] as any
  );

  const refundRows = (refunds as any).data ?? [];
  const refundedKobo = refundRows
    .filter((r: any) => r.status !== "failed")
    .reduce((s: number, r: any) => s + toNum(r.amount_kobo), 0);

  return {
    order,
    event: (event as any).data ?? null,
    organiser: (profile as any).data ?? null,
    organiserName: organiserName((profile as any).data),
    tickets: (tickets as any).data ?? [],
    refunds: refundRows,
    disputes: (disputes as any).data ?? [],
    notes: (notes as any).data ?? [],
    refundedKobo,
    refundableKobo: Math.max(0, toNum(order.gross_kobo) - refundedKobo),
  };
}

export interface AdminTicketRow {
  id: string;
  code: string;
  status: string;
  holderEmail: string | null;
  checkedInAt: string | null;
  createdAt: string;
  eventId: string | null;
  eventTitle: string;
  orderId: string | null;
}

export async function listTickets(opts: {
  page?: number;
  q?: string;
  status?: string;
}): Promise<Page<AdminTicketRow>> {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = admin
    .from("tickets")
    .select("id, code, status, holder_email, checked_in_at, created_at, event_id, order_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (opts.q?.trim()) {
    const t = like(opts.q);
    query = query.or(`code.ilike.${t},holder_email.ilike.${t}`);
  }
  if (opts.status === "checked_in") query = query.not("checked_in_at", "is", null);
  else if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);

  const { data, count } = await query;
  const rows = data ?? [];
  const eventIds = Array.from(new Set(rows.map((t: any) => t.event_id).filter(Boolean)));

  const events = eventIds.length
    ? await admin.from("events").select("id, title").in("id", eventIds)
    : { data: [] as any[] };
  const eventById = new Map<string, any>();
  for (const e of (events as any).data ?? []) eventById.set(e.id, e);

  return {
    rows: rows.map((t: any) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      holderEmail: t.holder_email,
      checkedInAt: t.checked_in_at,
      createdAt: t.created_at,
      eventId: t.event_id,
      eventTitle: eventById.get(t.event_id)?.title ?? "—",
      orderId: t.order_id,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// ── Settlements, refunds, disputes, attention ───────────────────

export async function listSettlements(opts: { page?: number; status?: string }) {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = admin
    .from("settlements")
    .select("*", { count: "exact" })
    .order("settled_at", { ascending: false, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1);
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);

  const { data, count } = await query;
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((s: any) => s.creator_id).filter(Boolean)));
  const profiles = ids.length
    ? await admin
        .from("profiles")
        .select("id, first_name, last_name, handle, box_office_name")
        .in("id", ids)
    : { data: [] as any[] };
  const byId = new Map<string, any>();
  for (const p of (profiles as any).data ?? []) byId.set(p.id, p);

  return {
    rows: rows.map((s: any) => ({ ...s, organiserName: organiserName(byId.get(s.creator_id)) })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

async function listWithEventAndBuyer(table: "refunds" | "disputes", opts: { page?: number; status?: string }) {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = admin
    .from(table)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);

  const { data, count } = await query;
  const rows = data ?? [];

  const orderIds = Array.from(new Set(rows.map((r: any) => r.order_id).filter(Boolean)));
  const eventIds = Array.from(new Set(rows.map((r: any) => r.event_id).filter(Boolean)));

  const [orders, events] = await Promise.all([
    orderIds.length
      ? admin.from("orders").select("id, reference, buyer_email, buyer_name").in("id", orderIds)
      : Promise.resolve({ data: [] as any[] }),
    eventIds.length
      ? admin.from("events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const orderById = new Map<string, any>();
  for (const o of (orders as any).data ?? []) orderById.set(o.id, o);
  const eventById = new Map<string, any>();
  for (const e of (events as any).data ?? []) eventById.set(e.id, e);

  return {
    rows: rows.map((r: any) => ({
      ...r,
      order: orderById.get(r.order_id) ?? null,
      eventTitle: eventById.get(r.event_id)?.title ?? "—",
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export const listRefunds = (o: { page?: number; status?: string }) =>
  listWithEventAndBuyer("refunds", o);
export const listDisputes = (o: { page?: number; status?: string }) =>
  listWithEventAndBuyer("disputes", o);

export async function listAttention(opts: { page?: number; status?: string; severity?: string }) {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = admin
    .from("attention_items")
    .select("*", { count: "exact" })
    // Critical first, then most recently seen. An admin opening this
    // should be looking at the worst thing on the platform, not the newest.
    .order("severity", { ascending: true })
    .order("last_seen_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  query = query.eq("status", opts.status && opts.status !== "all" ? opts.status : "open");
  if (opts.severity && opts.severity !== "all") query = query.eq("severity", opts.severity);

  const { data, count } = await query;
  return { rows: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

/** Just the counts, for the overview. */
export async function attentionSummary() {
  const admin = createAdminClient();
  try {
    const { data } = await admin
      .from("attention_items")
      .select("severity")
      .eq("status", "open");
    const rows = data ?? [];
    return {
      total: rows.length,
      critical: rows.filter((r: any) => r.severity === "critical").length,
      high: rows.filter((r: any) => r.severity === "high").length,
      available: true,
    };
  } catch {
    return { total: 0, critical: 0, high: 0, available: false };
  }
}
