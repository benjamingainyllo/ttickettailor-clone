import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Kobo } from "@/lib/money";

/**
 * Groups buying tickets together.
 *
 * Five friends going to the same party, each paying their own share. Each
 * participant pays for exactly one seat and gets exactly one ticket, so
 * every share is an ordinary single-ticket order going through the
 * ordinary checkout, the ordinary Paystack split and the ordinary ticket
 * issuing. Nothing about money is special-cased — a group is only a
 * bracket around orders that already work.
 */

/**
 * The share code.
 *
 * No 0/O, no 1/I/L. This gets read aloud off a phone screen in a noisy
 * room and typed into another one, and every ambiguous character is a
 * person in the wrong group or, worse, a stranger's.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeSplitCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export interface SplitParticipantView {
  id: string;
  name: string | null;
  email: string;
  amountKobo: Kobo;
  status: string;
  paidAt: string | null;
}

export interface SplitGroupView {
  id: string;
  code: string;
  status: string;
  seats: number;
  unitPriceKobo: Kobo;
  totalKobo: Kobo;
  paidKobo: Kobo;
  remainingKobo: Kobo;
  seatsTaken: number;
  seatsPaid: number;
  seatsLeft: number;
  expiresAt: string;
  expired: boolean;
  createdAt: string;
  initiatorName: string | null;
  initiatorEmail: string;
  participants: SplitParticipantView[];
  event: { id: string; title: string; date: string | null; location: string | null } | null;
}

/**
 * Everything about one group, with the arithmetic already done.
 *
 * The totals are computed from the participant rows every time rather
 * than kept on the group as running columns. Two people paying at once
 * would race a counter; counting the rows cannot disagree with itself.
 */
export async function getSplitGroup(code: string): Promise<SplitGroupView | null> {
  const admin = createAdminClient();

  const { data: group } = await admin
    .from("split_groups")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();

  if (!group) return null;

  const [{ data: participants }, { data: event }] = await Promise.all([
    admin
      .from("split_participants")
      .select("id, name, email, amount_kobo, status, paid_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: true }),
    admin
      .from("events")
      .select("id, title, date, location")
      .eq("id", group.event_id)
      .maybeSingle(),
  ]);

  const rows = participants ?? [];
  const paid = rows.filter((p: any) => p.status === "paid");
  const held = rows.filter((p: any) => p.status !== "refunded" && p.status !== "failed");
  const paidKobo = paid.reduce((s: number, p: any) => s + Number(p.amount_kobo ?? 0), 0);
  const totalKobo = Number(group.total_kobo ?? 0);

  return {
    id: group.id,
    code: group.code,
    status: group.status,
    seats: group.seats,
    unitPriceKobo: Number(group.unit_price_kobo ?? 0),
    totalKobo,
    paidKobo,
    remainingKobo: Math.max(0, totalKobo - paidKobo),
    seatsTaken: held.length,
    seatsPaid: paid.length,
    seatsLeft: Math.max(0, group.seats - held.length),
    expiresAt: group.expires_at,
    expired: new Date(group.expires_at).getTime() < Date.now(),
    createdAt: group.created_at,
    initiatorName: group.initiator_name,
    initiatorEmail: group.initiator_email,
    participants: rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      amountKobo: Number(p.amount_kobo ?? 0),
      status: p.status,
      paidAt: p.paid_at,
    })),
    event: event ?? null,
  };
}

/**
 * Called after a share is paid.
 *
 * Marks the participant, and closes the group when the last seat lands.
 * Idempotent: the same webhook arriving twice must not complete a group
 * twice or double-count a seat, so it keys off the participant's own
 * status rather than a counter.
 */
export async function markSplitShareePaid(orderId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: participant } = await admin
      .from("split_participants")
      .select("id, group_id, status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!participant || participant.status === "paid") return;

    await admin
      .from("split_participants")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", participant.id);

    const { data: group } = await admin
      .from("split_groups")
      .select("id, seats, status")
      .eq("id", participant.group_id)
      .maybeSingle();

    if (!group || group.status !== "open") return;

    const { count } = await admin
      .from("split_participants")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .eq("status", "paid");

    if ((count ?? 0) >= group.seats) {
      await admin
        .from("split_groups")
        .update({ status: "complete", completed_at: new Date().toISOString() })
        .eq("id", group.id)
        .eq("status", "open");
    }
  } catch (error) {
    console.error("Could not update split group for order", orderId, error);
  }
}

/**
 * Close out groups whose deadline has passed.
 *
 * Anybody who paid into a group that never filled has bought nothing, so
 * their share has to come back. This marks the group expired and raises
 * the refunds for a human — it deliberately does not refund automatically,
 * because money leaving on a timer with nobody watching is exactly the
 * kind of automation that goes wrong quietly.
 */
export async function expireStaleSplitGroups(): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data: stale } = await admin
      .from("split_groups")
      .select("id, code, event_id, creator_id")
      .eq("status", "open")
      .lt("expires_at", new Date().toISOString())
      .limit(50);

    if (!stale?.length) return 0;

    await admin
      .from("split_groups")
      .update({ status: "expired" })
      .in("id", stale.map((g: any) => g.id));

    const { raiseAttention } = await import("@/lib/disputes");
    for (const g of stale) {
      const { count } = await admin
        .from("split_participants")
        .select("id", { count: "exact", head: true })
        .eq("group_id", g.id)
        .eq("status", "paid");

      if ((count ?? 0) > 0) {
        await raiseAttention({
          kind: "split_expired_with_money",
          severity: "high",
          title: `Split group ${g.code} expired part-paid`,
          detail: `${count} ${count === 1 ? "person" : "people"} paid into a group that never filled. They bought nothing — refund them.`,
          dedupeKey: `split_expired:${g.id}`,
          subjectType: "event",
          subjectId: g.event_id,
          eventId: g.event_id,
          creatorId: g.creator_id,
        });
      }
    }

    return stale.length;
  } catch (error) {
    console.error("Could not expire split groups", error);
    return 0;
  }
}
