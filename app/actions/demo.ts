"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider, isDemoPaymentMode } from "@/lib/payments";
import { siteUrl, siteUrlIsMisconfigured } from "@/lib/site";

/**
 * The test sale.
 *
 * Everything needed to walk a real purchase already existed — the demo
 * payment provider, /checkout/demo, settlement, ticket issuing, the door
 * scanner. What did not exist was a way to GET there: an organiser had to
 * connect a bank, create an event, add a tier, publish it, find the public
 * link and then buy from themselves. Six screens before you can see the
 * one thing you wanted to see.
 *
 * This sets all six up in one go, marks everything it touches as demo so
 * it stays out of the real numbers, and hands back the buyer's link.
 *
 * TWO RULES IT WILL NOT BREAK:
 *
 *  1. It only runs when no real payment gateway is configured. With live
 *     keys, "simulate a payment" would be attempting a real charge.
 *  2. Everything it creates is deleteable in one click, and flagged so
 *     that until it is deleted it never counts as revenue.
 */

const DEMO_EVENT_TITLE = "Test event — safe to delete";
const DEMO_TICKET_PRICE_KOBO = 2_000_000; // ₦20,000: lands in the ₦450 band.

export interface DemoState {
  /** False once a real gateway is configured — the walkthrough hides itself. */
  available: boolean;
  bankConnected: boolean;
  event: {
    id: string;
    title: string;
  } | null;
  paidOrders: number;
  ticketsIssued: number;
  ticketsScanned: number;
  /** True when setup.sql hasn't been run yet, so is_demo doesn't exist. */
  needsMigration: boolean;
  /**
   * NEXT_PUBLIC_SITE_URL is set to something unusable and is being
   * ignored. Worth saying out loud here, because the same setting decides
   * where every ticket link in every email points.
   */
  siteUrlMisconfigured: boolean;
}

export async function getDemoState(): Promise<
  { ok: true; state: DemoState } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const admin = createAdminClient();

  const { data: account } = await admin
    .from("payout_accounts")
    .select("status, provider_subaccount_id")
    .eq("creator_id", user.id)
    .maybeSingle();

  const { data: events, error: eventsError } = await admin
    .from("events")
    .select("id, title")
    .eq("creator_id", user.id)
    .eq("is_demo", true)
    .order("created_at", { ascending: false })
    .limit(1);

  // The one error worth telling apart: the column doesn't exist yet, which
  // means setup.sql is still to be run. Everything else is a real failure.
  const needsMigration = Boolean(eventsError);

  const event = events?.[0] ?? null;

  let paidOrders = 0;
  let ticketsIssued = 0;
  let ticketsScanned = 0;

  if (event) {
    const [orders, tickets] = await Promise.all([
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "paid"),
      admin.from("tickets").select("checked_in_at").eq("event_id", event.id),
    ]);
    paidOrders = orders.count ?? 0;
    ticketsIssued = tickets.data?.length ?? 0;
    ticketsScanned = (tickets.data ?? []).filter((t) => t.checked_in_at).length;
  }

  return {
    ok: true as const,
    state: {
      available: isDemoPaymentMode(),
      bankConnected:
        account?.status === "active" && Boolean(account?.provider_subaccount_id),
      // Only the id and the title. The page builds its own links from
      // window.location.origin, because the browser is standing on the
      // real address and cannot be misconfigured about what it is.
      event: event ? { id: event.id, title: event.title } : null,
      paidOrders,
      ticketsIssued,
      ticketsScanned,
      needsMigration,
      siteUrlMisconfigured: siteUrlIsMisconfigured(),
    },
  };
}

export async function startDemoSale() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "You need to be signed in." };

  // Rule 1. With a real gateway configured there is no such thing as a
  // simulated payment, and this must not pretend otherwise.
  if (!isDemoPaymentMode()) {
    return {
      success: false as const,
      error:
        "A real payment gateway is connected, so test sales are switched off. Take a real ticket off sale instead.",
    };
  }

  const admin = createAdminClient();

  try {
    // ---- A payout account, because the publish gate is a database
    // trigger and refuses a paid event without one. ----
    const { data: existing } = await admin
      .from("payout_accounts")
      .select("status, provider_subaccount_id")
      .eq("creator_id", user.id)
      .maybeSingle();

    if (!existing?.provider_subaccount_id || existing.status !== "active") {
      const provider = getPaymentProvider();
      const subaccount = await provider.createSubaccount({
        businessName: "Demo payouts",
        bankCode: "001",
        accountNumber: "0000000000",
        platformFeeBps: 0,
      });

      const { error: accountError } = await admin.from("payout_accounts").upsert(
        {
          creator_id: user.id,
          provider: provider.name,
          provider_subaccount_id: subaccount.providerSubaccountId,
          bank_code: "001",
          bank_name: "Demo Bank",
          account_name: subaccount.accountName ?? "Demo Account",
          account_number_last4: "0000",
          status: "active",
        },
        { onConflict: "creator_id" }
      );

      if (accountError) {
        return {
          success: false as const,
          error: "Could not set up the demo payout account.",
        };
      }
    }

    // ---- The event. Dated a week out so it is clearly upcoming, and
    // published straight away so the public page works. ----
    const inAWeek = new Date();
    inAWeek.setDate(inAWeek.getDate() + 7);

    const { data: event, error: eventError } = await admin
      .from("events")
      .insert({
        creator_id: user.id,
        title: DEMO_EVENT_TITLE,
        description:
          "This is a test event so you can see the whole flow — buying a ticket, paying, getting it delivered, and scanning it at the door. No money moves. Delete it whenever you like.",
        date: inAWeek.toISOString().slice(0, 10),
        time: "8:00 PM",
        location: "Nowhere in particular",
        price_kobo: DEMO_TICKET_PRICE_KOBO,
        status: "Upcoming",
        publish_status: "published",
        pass_fee_to_buyer: false,
        is_demo: true,
      })
      .select("id, title")
      .single();

    if (eventError || !event) {
      // The commonest cause by far, and the one with a fix he can act on.
      const missingColumn = eventError?.message?.includes("is_demo");
      return {
        success: false as const,
        error: missingColumn
          ? "Your database needs updating first — run setup.sql, then try again."
          : "Could not create the test event.",
      };
    }

    const { error: tierError } = await admin.from("ticket_types").insert({
      event_id: event.id,
      name: "General Admission",
      price_kobo: DEMO_TICKET_PRICE_KOBO,
      sort_order: 0,
    });

    if (tierError) {
      // A published event with nothing to sell is a dead end, so don't
      // leave one lying around.
      await admin.from("events").delete().eq("id", event.id);
      return { success: false as const, error: "Could not add a ticket to the test event." };
    }

    revalidatePath("/demo");
    revalidatePath("/events");

    return { success: true as const, eventId: event.id };
  } catch (error) {
    console.error("Could not start the demo sale", error);
    return { success: false as const, error: "Something went wrong setting the test up." };
  }
}

export async function clearDemoData() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "You need to be signed in." };

  const admin = createAdminClient();

  try {
    const { data: events } = await admin
      .from("events")
      .select("id")
      .eq("creator_id", user.id)
      .eq("is_demo", true);

    const ids = (events ?? []).map((e) => e.id);

    // ORDER MATTERS. orders.event_id is ON DELETE SET NULL, but orders
    // carries a CHECK that an event order has an event_id — so deleting
    // the event first makes Postgres try to null a column it is not
    // allowed to null, and the whole delete fails. Orders go first, and
    // their tickets cascade away with them.
    if (ids.length > 0) {
      await admin.from("orders").delete().in("event_id", ids);
      await admin.from("events").delete().in("id", ids);
    }

    // Any stray demo order not attached to one of those events.
    await admin
      .from("orders")
      .delete()
      .eq("creator_id", user.id)
      .eq("is_demo", true);

    revalidatePath("/demo");
    revalidatePath("/events");
    revalidatePath("/revenue");

    return { success: true as const, deleted: ids.length };
  } catch (error) {
    console.error("Could not clear demo data", error);
    return { success: false as const, error: "Could not delete the test data." };
  }
}
