import { createAdminClient } from "@/lib/supabase/admin";
import type { Kobo } from "@/lib/money";
import type { PaymentChannel } from "@/lib/payments";
import { issueTicketsForOrder, type IssuedTicket } from "@/lib/tickets";
import { getEmailProvider } from "@/lib/email";
import { getWhatsAppProvider, toE164 } from "@/lib/whatsapp";
import { orderTicketsUrl, ticketUrl } from "@/lib/site";
import { awardReferralCredits } from "@/lib/referrals";
import { ticketConfirmationEmail } from "@/lib/email/templates";

/**
 * Settling an order — the one place a pending order becomes paid.
 *
 * Called from the webhook and from the checkout return page. Both can fire
 * for the same order, so this must be safe to run concurrently and more
 * than once: the guarded UPDATE only ever succeeds for a single caller.
 */
export interface SettleOrderInput {
  reference: string;
  providerReference?: string | null;
  providerFeeKobo?: Kobo | null;
  channel?: PaymentChannel | null;
  paidAt?: string | null;
}

export async function settleOrder(input: SettleOrderInput) {
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("orders")
    .select("*")
    .eq("reference", input.reference)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!order) return { ok: false as const, error: "Order not found" };
  if (order.status === "paid") {
    // Settled, but issuance may have died before it finished last time.
    // Both steps are idempotent, so it is safe to finish the job here.
    await fulfillOrder(order);
    return { ok: true as const, order, alreadySettled: true };
  }

  // Prefer the figure the split was actually built on. With the buyer
  // funding processing, the organiser's settlement is charge minus our
  // transaction_charge — both fixed when checkout ran — so recomputing it
  // from whatever the provider reports afterwards would move a number
  // that did not move. Any gap between the two is Paylance's, by design.
  const providerFeeKobo =
    Number(order.provider_fee_kobo ?? 0) > 0
      ? Number(order.provider_fee_kobo)
      : (input.providerFeeKobo ?? 0);
  const netKobo = Math.max(
    0,
    Number(order.gross_kobo) - Number(order.platform_fee_kobo) - Number(providerFeeKobo)
  );

  // Guarded on status so a concurrent settle can't double-apply.
  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({
      status: "paid",
      provider_reference: input.providerReference ?? order.provider_reference,
      provider_fee_kobo: providerFeeKobo,
      net_kobo: netKobo,
      payment_channel: input.channel ?? order.payment_channel,
      paid_at: input.paidAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (updateError) return { ok: false as const, error: updateError.message };

  if (!updated) {
    // Someone else won the race. Not an error, and not something to count twice.
    return { ok: true as const, order, alreadySettled: true };
  }

  if (updated.event_id) {
    await admin.rpc("increment_event_attendees", {
      p_event_id: updated.event_id,
      p_attendees: updated.quantity ?? 1,
    });
  }

  await upsertAudienceMember(updated);

  // A referral pays out when the organiser it brought in sells their first
  // PAID ticket — never on a free registration, which anyone could create
  // for themselves in a minute. Awarding is idempotent and does nothing at
  // all once the referral has been settled, so calling it on every order
  // is cheaper than remembering which order was the first.
  if (Number(updated.gross_kobo ?? 0) > 0 && updated.creator_id) {
    await awardReferralCredits(updated.creator_id);
  }

  await fulfillOrder(updated);

  return { ok: true as const, order: updated };
}

/**
 * Everything the buyer actually receives: their tickets, and the email
 * carrying them.
 *
 * Kept separate from settlement, and safe to call more than once, because
 * the two can fail independently — a settled order with no tickets is a
 * bug the next call should be able to repair. Never throws: a buyer whose
 * payment succeeded must not see an error because our mail provider is
 * down, and the tickets exist in the database either way.
 */
async function fulfillOrder(order: any) {
  if (!order?.event_id) return;

  try {
    const issued = await issueTicketsForOrder(order);

    if (!issued.ok) {
      console.error("Could not issue tickets for order", order.reference, issued.error);
      return;
    }

    // Only the caller that claimed the first issue sends mail, so a
    // replayed webhook cannot email the buyer their tickets twice.
    if (!issued.firstIssue || issued.tickets.length === 0) return;

    await deliverTickets(order, issued.tickets);
  } catch (error) {
    console.error("Fulfilment failed for order", order?.reference, error);
  }
}

/**
 * Getting the tickets to the buyer.
 *
 * WhatsApp first, because this is Nigeria and that is where people
 * actually read things — an email can sit unopened until the day after the
 * event. Email still goes every time regardless, because it is the
 * durable copy: it survives a changed phone, a lost chat, and a WhatsApp
 * template that Meta has suspended.
 *
 * Neither failure stops the other, and neither stops the order. The
 * tickets exist in the database the moment payment settles; a message is
 * how somebody is told, not what makes it real. The ticket page is always
 * reachable from the order reference.
 */
export async function deliverTickets(order: any, tickets: IssuedTicket[]) {
  // Sent in parallel: a slow WhatsApp call should not hold up the email,
  // and this runs inside a webhook that a provider will time out.
  await Promise.allSettled([
    sendTicketWhatsApp(order, tickets),
    sendTicketEmail(order, tickets),
  ]);
}

async function sendTicketWhatsApp(order: any, tickets: IssuedTicket[]) {
  const phone = order.buyer_phone ? toE164(order.buyer_phone) : null;
  if (!phone) return; // No number given, or not one we can send to.

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("title, date, time, location")
    .eq("id", order.event_id)
    .maybeSingle();

  const when = [
    event?.date
      ? new Date(event.date).toLocaleDateString("en-NG", {
          weekday: "short",
          day: "numeric",
          month: "long",
        })
      : null,
    event?.time,
  ]
    .filter(Boolean)
    .join(" · ") || null;

  const result = await getWhatsAppProvider().sendTickets({
    to: phone,
    buyerName: order.buyer_name ?? null,
    eventTitle: event?.title ?? order.item_title ?? "your event",
    when,
    location: event?.location ?? null,
    orderReference: order.reference,
    ticketsUrl: orderTicketsUrl(order.reference),
    tickets: tickets.map((t) => ({ code: t.code, url: ticketUrl(t.code) })),
  });

  if (!result.ok) {
    console.error("Ticket WhatsApp failed for order", order.reference, result.error);
  }
}

async function sendTicketEmail(order: any, tickets: IssuedTicket[]) {
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("title, date, time, location, creator_id")
    .eq("id", order.event_id)
    .maybeSingle();

  let organiserName: string | null = null;
  if (event?.creator_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", event.creator_id)
      .maybeSingle();
    organiserName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;
  }

  const message = ticketConfirmationEmail({
    buyerName: order.buyer_name ?? null,
    buyerEmail: order.buyer_email,
    eventTitle: event?.title ?? order.item_title ?? "your event",
    eventDate: event?.date ?? null,
    eventTime: event?.time ?? null,
    eventLocation: event?.location ?? null,
    organiserName,
    orderReference: order.reference,
    totalKobo: Number(order.gross_kobo ?? 0),
    tickets,
  });

  const result = await getEmailProvider().send(message);
  if (!result.ok) {
    console.error("Ticket email failed for order", order.reference, result.error);
  }
}

export async function markOrderFailed(reference: string, status: "failed" | "abandoned") {
  const admin = createAdminClient();

  // Guarded on 'pending' so only one caller can fail an order — which is
  // also what makes releasing the allocation below safe to do here. A
  // second call finds nothing to update and releases nothing.
  const { data: failed } = await admin
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "pending")
    .select("id, ticket_type_id, quantity")
    .maybeSingle();

  if (!failed) return;

  // Put the seats back on the shelf. Without this an abandoned checkout
  // would hold an allocation forever and the event would sell out at the
  // wrong number.
  if (failed.ticket_type_id) {
    await admin.rpc("release_ticket_inventory", {
      p_ticket_type_id: failed.ticket_type_id,
      p_quantity: failed.quantity ?? 1,
    });
  }

  // And the merchandise. Same reasoning, same consequence: a shirt held by
  // an abandoned checkout is a shirt nobody can buy, and the organiser would
  // be told they had sold out with the stock still in the box.
  //
  // Guarded by the same 'pending' update above, so a second call finds
  // nothing and releases nothing — the stock cannot be handed back twice.
  const { data: lines } = await admin
    .from("order_products")
    .select("product_id, quantity")
    .eq("order_id", failed.id);

  for (const line of lines ?? []) {
    if (!line.product_id) continue;
    try {
      await admin.rpc("release_product_inventory", {
        p_product_id: line.product_id,
        p_quantity: line.quantity ?? 1,
      });
    } catch (error) {
      console.error("Could not release product inventory:", error);
    }
  }
}

/** A buyer becomes an audience contact the moment they actually pay. */
async function upsertAudienceMember(order: any) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("audience")
    .select("id, total_spent_kobo, purchase_count")
    .eq("creator_id", order.creator_id)
    .eq("email", order.buyer_email)
    .maybeSingle();

  if (existing) {
    await admin
      .from("audience")
      .update({
        total_spent_kobo: Number(existing.total_spent_kobo ?? 0) + Number(order.gross_kobo),
        purchase_count: Number(existing.purchase_count ?? 0) + 1,
        // Column named for the old digital-products feature. Kept rather
        // than renamed: it holds whatever was bought, and a rename would
        // be a migration with no benefit to anybody using the product.
        last_offer: order.item_title ?? null,
        stage: "buyer",
        last_seen: now,
      })
      .eq("id", existing.id);
    return;
  }

  await admin.from("audience").insert({
    creator_id: order.creator_id,
    email: order.buyer_email,
    name: order.buyer_name ?? null,
    stage: "buyer",
    total_spent_kobo: Number(order.gross_kobo),
    purchase_count: 1,
    last_offer: order.item_title ?? null,
    first_seen: now,
    last_seen: now,
  });
}
