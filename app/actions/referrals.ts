"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReferralSummary, type ReferralSummary } from "@/lib/referrals";

/**
 * Spending a referral credit.
 *
 * A credit is one free event: Paylance takes no fee on any ticket sold
 * for it. Two facts have to move together — the credit is marked spent,
 * and the event is marked fee_waived, which is what checkout reads. This
 * file is the only thing allowed to write either of them, so they cannot
 * drift apart anywhere else in the codebase.
 *
 * Postgres has no transaction across two supabase-js calls, so the order
 * matters: the credit is claimed FIRST, with the claim guarded on it
 * still being available. If the second write then fails, the organiser
 * has lost a credit and not got a free event — recoverable, and they can
 * be given another one. Doing it the other way round would waive the fee
 * on an event without spending anything, which is a free event for every
 * organiser who retried until it broke.
 */

export interface EligibleEvent {
  id: string;
  title: string;
  date: string | null;
  feeWaived: boolean;
  /** True once money has come in — a waiver can no longer be taken back. */
  hasSales: boolean;
}

export interface ReferPageData {
  summary: ReferralSummary;
  events: EligibleEvent[];
}

export async function getReferPageData(): Promise<
  { ok: true; data: ReferPageData } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [summary, events] = await Promise.all([
    getReferralSummary(user.id),
    admin
      .from("events")
      .select("id, title, date, fee_waived")
      .eq("creator_id", user.id)
      .order("date", { ascending: true }),
  ]);

  const rows = events.data ?? [];
  const ids = rows.map((e) => e.id);

  // An event sells ticket types, so "does this cost anything" is a
  // question about its tiers, not about the event row.
  const [tiers, orders] = await Promise.all([
    ids.length
      ? admin.from("ticket_types").select("event_id, price_kobo").in("event_id", ids)
      : Promise.resolve({ data: [] as { event_id: string; price_kobo: number }[] }),
    ids.length
      ? admin
          .from("orders")
          .select("event_id, gross_kobo")
          .eq("status", "paid")
          .in("event_id", ids)
      : Promise.resolve({ data: [] as { event_id: string; gross_kobo: number }[] }),
  ]);

  const charges = new Set(
    (tiers.data ?? []).filter((t) => Number(t.price_kobo ?? 0) > 0).map((t) => t.event_id)
  );
  const sold = new Set(
    (orders.data ?? []).filter((o) => Number(o.gross_kobo ?? 0) > 0).map((o) => o.event_id)
  );

  return {
    ok: true as const,
    data: {
      summary,
      events: rows
        // A credit is only worth something on an event that charges, and
        // only usable on one that hasn't happened yet.
        .filter((e) => charges.has(e.id) && (!e.date || e.date >= today))
        .map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          feeWaived: Boolean(e.fee_waived),
          hasSales: sold.has(e.id),
        })),
    },
  };
}

export async function applyCreditToEvent(eventId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "You need to be signed in." };

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, creator_id, date, fee_waived")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.creator_id !== user.id) {
    return { success: false as const, error: "We couldn't find that event." };
  }
  if (event.fee_waived) {
    return { success: false as const, error: "This event is already free of fees." };
  }
  if (event.date && event.date < new Date().toISOString().slice(0, 10)) {
    return { success: false as const, error: "That event has already happened." };
  }

  // Claim a credit, guarded on it still being available. Two clicks in
  // two tabs cannot both win this: the second update matches no row.
  const { data: credit } = await admin
    .from("referral_credits")
    .select("id")
    .eq("creator_id", user.id)
    .eq("status", "available")
    .limit(1)
    .maybeSingle();

  if (!credit) {
    return { success: false as const, error: "You don't have a free event to use yet." };
  }

  const { data: claimed } = await admin
    .from("referral_credits")
    .update({
      status: "applied",
      event_id: eventId,
      applied_at: new Date().toISOString(),
    })
    .eq("id", credit.id)
    .eq("status", "available")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    return { success: false as const, error: "That credit was just used somewhere else." };
  }

  const { error: waiveError } = await admin
    .from("events")
    .update({ fee_waived: true })
    .eq("id", eventId)
    .eq("creator_id", user.id);

  if (waiveError) {
    // Hand the credit back rather than leaving it spent on nothing.
    await admin
      .from("referral_credits")
      .update({ status: "available", event_id: null, applied_at: null })
      .eq("id", claimed.id);
    return { success: false as const, error: "Could not apply it. Try again." };
  }

  revalidatePath("/refer");
  return { success: true as const };
}

export async function removeCreditFromEvent(eventId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "You need to be signed in." };

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, creator_id, fee_waived")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.creator_id !== user.id || !event.fee_waived) {
    return { success: false as const, error: "We couldn't find that event." };
  }

  // THE ONE RULE THAT MATTERS HERE. Once a ticket has sold fee-free, the
  // credit has been spent for real and cannot come back. Without this, an
  // organiser could waive the fee, sell the whole event, take it off, and
  // spend the same credit again on the next one — indefinitely.
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "paid")
    .gt("gross_kobo", 0);

  if ((count ?? 0) > 0) {
    return {
      success: false as const,
      error: "This event has already sold tickets with no fee, so it's been used.",
    };
  }

  const { error } = await admin
    .from("events")
    .update({ fee_waived: false })
    .eq("id", eventId)
    .eq("creator_id", user.id);

  if (error) return { success: false as const, error: "Could not move it. Try again." };

  await admin
    .from("referral_credits")
    .update({ status: "available", event_id: null, applied_at: null })
    .eq("creator_id", user.id)
    .eq("event_id", eventId)
    .eq("status", "applied");

  revalidatePath("/refer");
  return { success: true as const };
}
