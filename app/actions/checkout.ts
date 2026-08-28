"use server";

import { v4 as uuidv4 } from "uuid";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateOrderPlatformFeeKobo,
  DEFAULT_PLATFORM_FEE_TYPE,
  DEFAULT_PLATFORM_FEE_VALUE,
  type Kobo,
  type PlatformFeeType,
} from "@/lib/money";
import { getPaymentProvider, isDemoPaymentMode } from "@/lib/payments";
import { markOrderFailed, settleOrder } from "@/lib/orders";

interface CheckoutPayload {
  itemType: "offer" | "event";
  itemId: string;
  buyerEmail: string;
  buyerName?: string;
  buyerPhone?: string;
  /** Which tier, for events. Falls back to the event's only tier. */
  ticketTypeId?: string;
  /** How many admissions. Events only; offers are always 1. */
  quantity?: number;
}

interface CheckoutResult {
  success: boolean;
  error?: string;
  authorizationUrl?: string | null;
  reference?: string | null;
  /** Free items complete instantly — there is no provider round-trip. */
  completedWithoutPayment?: boolean;
}

function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const host = headers().get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Starts a checkout.
 *
 * Paylance never receives the buyer's money. For paid items the provider
 * splits at transaction time using the creator's subaccount, so the
 * creator's share settles to their own bank and we only ever receive the
 * platform fee. A paid checkout without an active payout account is
 * refused here rather than falling back to a platform-custody charge.
 */
export async function createCheckoutSession(payload: CheckoutPayload): Promise<CheckoutResult> {
  let reservation: { ticketTypeId: string; quantity: number } | null = null;

  try {
    if (!payload.itemId || !payload.itemType) {
      return { success: false, error: "Nothing to check out." };
    }
    if (!payload.buyerEmail) {
      return { success: false, error: "Please enter your email." };
    }

    const admin = createAdminClient();
    const item = await loadSellableItem(payload);

    if (!item.ok) return { success: false, error: item.error };

    const { creatorId, id: itemId, title, unitPriceKobo, ticketTypeId, quantity, passFeeToBuyer } = item;
    const reference = uuidv4();
    const grossKobo: Kobo = unitPriceKobo * quantity;

    // Take the allocation before the order exists. Doing it the other way
    // round would leave an order nobody can honour when the last tickets
    // go while we're still writing.
    if (ticketTypeId) {
      const { data: reserved, error: reserveError } = await admin.rpc(
        "reserve_ticket_inventory",
        { p_ticket_type_id: ticketTypeId, p_quantity: quantity }
      );

      if (reserveError) {
        console.error("Inventory reservation failed:", reserveError);
        return { success: false, error: "Could not hold those tickets. Please try again." };
      }
      if (!reserved) {
        return {
          success: false,
          error:
            quantity === 1
              ? "That ticket just sold out."
              : `There aren't ${quantity} tickets left at that price.`,
        };
      }

      reservation = { ticketTypeId, quantity };
    }

    const orderRow = {
      reference,
      creator_id: creatorId,
      item_type: payload.itemType,
      offer_id: payload.itemType === "offer" ? itemId : null,
      event_id: payload.itemType === "event" ? itemId : null,
      ticket_type_id: ticketTypeId,
      item_title: title,
      quantity,
      buyer_email: payload.buyerEmail,
      buyer_name: payload.buyerName ?? null,
      buyer_phone: payload.buyerPhone ?? null,
    };

    // ---- Free: record the order, no money moves, tickets issue on settle. ----
    if (grossKobo === 0) {
      const { error: insertError } = await admin.from("orders").insert({
        ...orderRow,
        gross_kobo: 0,
        platform_fee_kobo: 0,
        provider_fee_kobo: 0,
        net_kobo: 0,
        status: "pending",
      });

      if (insertError) {
        console.error("Free registration failed:", insertError);
        await releaseReservation(reservation);
        return { success: false, error: "Could not complete your registration." };
      }

      const settled = await settleOrder({ reference, channel: "unknown" });
      if (!settled.ok) {
        // settleOrder failing leaves the order pending; markOrderFailed
        // both fails it and hands the seats back.
        await markOrderFailed(reference, "failed");
        reservation = null;
        return { success: false, error: "Could not complete your registration." };
      }

      reservation = null;
      return { success: true, reference, completedWithoutPayment: true, authorizationUrl: null };
    }

    // ---- Paid: requires a connected bank account. ----
    const { data: payoutAccount } = await admin
      .from("payout_accounts")
      .select("provider_subaccount_id, status, platform_fee_type, platform_fee_value")
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (
      !payoutAccount ||
      payoutAccount.status !== "active" ||
      !payoutAccount.provider_subaccount_id
    ) {
      // Deliberately not falling back to a non-split charge: that would put
      // the money in Paylance's account, which we must never do.
      await releaseReservation(reservation);
      return {
        success: false,
        error: "This organiser hasn't finished setting up payments yet.",
      };
    }

    // Priced per ticket, not per order — a flat fee has to see the quantity.
    const platformFeeKobo = calculateOrderPlatformFeeKobo(
      unitPriceKobo,
      quantity,
      (payoutAccount.platform_fee_type ?? DEFAULT_PLATFORM_FEE_TYPE) as PlatformFeeType,
      payoutAccount.platform_fee_value ?? DEFAULT_PLATFORM_FEE_VALUE
    );

    // When the organiser has chosen to pass the fee on, the buyer is charged
    // the ticket price PLUS the fee, and the organiser receives the full face
    // value. gross_kobo is always what the card was actually charged, so
    // net = gross - fee holds either way and the figures reconcile with the
    // provider's own record of the transaction.
    const chargeKobo: Kobo = passFeeToBuyer ? grossKobo + platformFeeKobo : grossKobo;

    const { error: insertError } = await admin.from("orders").insert({
      ...orderRow,
      gross_kobo: chargeKobo,
      platform_fee_kobo: platformFeeKobo,
      provider_fee_kobo: 0,
      net_kobo: chargeKobo - platformFeeKobo,
      status: "pending",
    });

    if (insertError) {
      console.error("Order creation failed:", insertError);
      await releaseReservation(reservation);
      return { success: false, error: "Could not start checkout." };
    }

    const provider = getPaymentProvider();

    try {
      const { authorizationUrl } = await provider.initializeCheckout({
        reference,
        buyerEmail: payload.buyerEmail,
        amountKobo: chargeKobo,
        platformFeeKobo,
        providerSubaccountId: payoutAccount.provider_subaccount_id,
        callbackUrl: `${siteOrigin()}/checkout/success?reference=${reference}`,
        metadata: {
          item_type: payload.itemType,
          item_id: itemId,
          creator_id: creatorId,
          ticket_type_id: ticketTypeId,
          quantity,
        },
      });

      // The order now owns the allocation — it is released by
      // markOrderFailed if the payment never lands.
      reservation = null;
      return { success: true, authorizationUrl, reference };
    } catch (providerError) {
      await markOrderFailed(reference, "failed");
      reservation = null;
      console.error("Provider init failed:", providerError);
      return { success: false, error: "Could not start payment. Please try again." };
    }
  } catch (error) {
    console.error("Checkout error:", error);
    await releaseReservation(reservation);
    return { success: false, error: "Something went wrong starting checkout." };
  }
}

/** Hand back an allocation no order ended up owning. */
async function releaseReservation(
  reservation: { ticketTypeId: string; quantity: number } | null
) {
  if (!reservation) return;
  try {
    await createAdminClient().rpc("release_ticket_inventory", {
      p_ticket_type_id: reservation.ticketTypeId,
      p_quantity: reservation.quantity,
    });
  } catch (error) {
    console.error("Could not release ticket inventory:", error);
  }
}

/**
 * Fallback verification for the return page, in case the webhook is late.
 * Always re-checks with the provider — never trusts the redirect alone.
 */
export async function verifyCheckout(reference: string) {
  try {
    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("reference, status, item_title, gross_kobo, item_type")
      .eq("reference", reference)
      .maybeSingle();

    if (!order) return { success: false as const, error: "Order not found." };
    if (order.status === "paid") {
      return { success: true as const, status: "paid" as const, order };
    }
    // A free order settles inline, so anything still pending here is a payment.
    if (Number(order.gross_kobo) === 0) {
      return { success: true as const, status: order.status, order };
    }

    const verified = await getPaymentProvider().verifyTransaction(reference);

    if (verified.status === "paid") {
      const settled = await settleOrder({
        reference,
        providerReference: verified.providerReference,
        providerFeeKobo: verified.providerFeeKobo,
        channel: verified.channel,
        paidAt: verified.paidAt,
      });
      if (!settled.ok) return { success: false as const, error: settled.error };
      return { success: true as const, status: "paid" as const, order: { ...order, status: "paid" } };
    }

    if (verified.status === "failed" || verified.status === "abandoned") {
      await markOrderFailed(reference, verified.status);
    }

    return { success: true as const, status: verified.status, order };
  } catch (error) {
    console.error("Verify checkout error:", error);
    return { success: false as const, error: "Could not verify payment status." };
  }
}

/**
 * Look up an order for the demo checkout screen.
 * Refuses outright once a real gateway is configured.
 */
export async function getDemoOrder(reference: string) {
  if (!isDemoPaymentMode()) {
    return { success: false as const, error: "Demo checkout is disabled." };
  }

  try {
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("reference, item_title, item_type, gross_kobo, status, buyer_email, buyer_name")
      .eq("reference", reference)
      .maybeSingle();

    if (!order) return { success: false as const, error: "Order not found." };
    return { success: true as const, order };
  } catch (error) {
    // Almost always the missing service-role key. Say so, rather than
    // letting it surface as a misleading "order not found".
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not load this order.",
    };
  }
}

/**
 * Complete or fail a simulated payment.
 *
 * This exists only so the product can be demonstrated before a gateway is
 * connected. It settles through the SAME `settleOrder` path a real provider
 * webhook uses, so what you see in the dashboard is produced by the real
 * code — only the money is imaginary.
 */
export async function completeDemoCheckout(reference: string, outcome: "paid" | "failed") {
  // Hard stop: the moment a real key exists, this can never run.
  if (!isDemoPaymentMode()) {
    return { success: false as const, error: "Demo checkout is disabled." };
  }

  try {
    if (outcome === "failed") {
      await markOrderFailed(reference, "failed");
      return { success: true as const, status: "failed" as const };
    }

    const settled = await settleOrder({ reference, channel: "card" });
    if (!settled.ok) return { success: false as const, error: settled.error };

    return { success: true as const, status: "paid" as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not complete this payment.",
    };
  }
}

type LoadedItem =
  | {
      ok: true;
      id: string;
      creatorId: string;
      title: string;
      /** Price of ONE admission. The order total is this times quantity. */
      unitPriceKobo: Kobo;
      ticketTypeId: string | null;
      /** True when the organiser has chosen to add our fee to the buyer's total. */
      passFeeToBuyer: boolean;
      quantity: number;
    }
  | { ok: false; error: string };

/**
 * Resolve what is actually being bought, and refuse anything that isn't
 * on sale right now.
 *
 * Price comes from the ticket TIER, never from the client — the browser
 * sends an id and a quantity and nothing else that touches money.
 */
async function loadSellableItem(payload: CheckoutPayload): Promise<LoadedItem> {
  const admin = createAdminClient();

  if (payload.itemType === "offer") {
    const { data } = await admin
      .from("offers")
      .select("id, user_id, title, price_kobo, publish_status")
      .eq("id", payload.itemId)
      .maybeSingle();

    if (!data) return { ok: false, error: "This item is no longer available." };
    if (data.publish_status !== "published") {
      return { ok: false, error: "This item isn't on sale yet." };
    }

    return {
      ok: true,
      id: data.id,
      creatorId: data.user_id,
      title: data.title,
      unitPriceKobo: Number(data.price_kobo ?? 0),
      ticketTypeId: null,
      quantity: 1,
      // Offers have no organiser-facing switch; the seller always absorbs it.
      passFeeToBuyer: false,
    };
  }

  const { data: event } = await admin
    .from("events")
    .select("id, creator_id, title, publish_status, capacity, attendees_count, pass_fee_to_buyer")
    .eq("id", payload.itemId)
    .maybeSingle();

  if (!event) return { ok: false, error: "This event is no longer available." };
  if (event.publish_status !== "published") {
    return { ok: false, error: "This event isn't on sale yet." };
  }

  // A named tier if the buyer picked one, otherwise the event's cheapest
  // — which is the only one when an event has a single tier.
  const tierQuery = admin
    .from("ticket_types")
    .select("id, name, price_kobo, quantity, sold_count, max_per_order, status, sales_start, sales_end")
    .eq("event_id", event.id)
    .eq("status", "active");

  const { data: tier } = payload.ticketTypeId
    ? await tierQuery.eq("id", payload.ticketTypeId).maybeSingle()
    : await tierQuery.order("price_kobo").limit(1).maybeSingle();

  if (!tier) return { ok: false, error: "That ticket type isn't available." };

  const now = Date.now();
  if (tier.sales_start && new Date(tier.sales_start).getTime() > now) {
    return { ok: false, error: `${tier.name} isn't on sale yet.` };
  }
  if (tier.sales_end && new Date(tier.sales_end).getTime() < now) {
    return { ok: false, error: `Sales for ${tier.name} have closed.` };
  }

  const requested = Math.floor(Number(payload.quantity ?? 1));
  if (!Number.isSafeInteger(requested) || requested < 1) {
    return { ok: false, error: "Choose at least one ticket." };
  }

  const maxPerOrder = Number(tier.max_per_order ?? 10);
  if (requested > maxPerOrder) {
    return {
      ok: false,
      error: `You can buy at most ${maxPerOrder} ${maxPerOrder === 1 ? "ticket" : "tickets"} at a time.`,
    };
  }

  // The tier's own allocation is enforced atomically at reservation time.
  // This is the event-wide ceiling, which is a separate limit.
  if (event.capacity !== null && event.capacity !== undefined) {
    const remaining = Number(event.capacity) - Number(event.attendees_count ?? 0);
    if (remaining <= 0) return { ok: false, error: "This event is sold out." };
    if (requested > remaining) {
      return { ok: false, error: `Only ${remaining} ${remaining === 1 ? "ticket" : "tickets"} left.` };
    }
  }

  return {
    ok: true,
    id: event.id,
    creatorId: event.creator_id,
    title: event.title,
    unitPriceKobo: Number(tier.price_kobo ?? 0),
    ticketTypeId: tier.id,
    quantity: requested,
    passFeeToBuyer: Boolean(event.pass_fee_to_buyer),
  };
}
