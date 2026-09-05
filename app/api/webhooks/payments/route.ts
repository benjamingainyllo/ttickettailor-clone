import { NextRequest, NextResponse } from "next/server";
import { recordDispute } from "@/lib/disputes";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { markOrderFailed, settleOrder } from "@/lib/orders";

/**
 * Inbound payment provider webhook.
 *
 * Provider-agnostic by design: the route knows nothing about Paystack, it
 * just asks the configured provider to verify the signature and normalise
 * the payload. Every event is recorded in `webhook_events`, whose unique
 * constraint is what makes a replayed event a no-op.
 */
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();

  // The signature covers the RAW bytes, so it must be checked before parsing.
  const rawBody = await request.text();
  const signature = request.headers.get(provider.webhookSignatureHeader);

  let signatureValid = false;
  try {
    signatureValid = provider.verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    console.error("Webhook signature check failed:", error);
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = provider.parseWebhookEvent(payload);
  const admin = createAdminClient();

  // Claim the event. A duplicate insert means we've already handled it.
  const { error: claimError } = await admin.from("webhook_events").insert({
    provider: provider.name,
    provider_event_id: event.providerEventId,
    event_type: event.type,
    reference: event.reference,
    payload: payload as any,
    signature_valid: true,
  });

  if (claimError) {
    // 23505 = unique violation = replay. Acknowledge without reprocessing.
    if ((claimError as any).code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("Could not record webhook event:", claimError);
  }

  let processingError: string | null = null;

  try {
    if (event.type === "payment.succeeded" && event.reference) {
      const settled = await settleOrder({
        reference: event.reference,
        providerReference: event.providerReference,
        providerFeeKobo: event.providerFeeKobo,
        channel: event.channel,
        paidAt: event.paidAt,
      });
      if (!settled.ok) processingError = settled.error;
    } else if (event.type === "payment.failed" && event.reference) {
      await markOrderFailed(event.reference, "failed");
    } else if (event.type === "settlement.succeeded") {
      await recordSettlement(provider.name, event);
    }

    // Disputes arrive on the same endpoint with a different event name, so
    // they are parsed from the raw payload rather than squeezed into the
    // normalised transaction shape. Handled outside the if-chain above
    // because charge.dispute.* is not a payment lifecycle event at all.
    const dispute = provider.parseDisputeEvent(payload);
    if (dispute) {
      const recorded = await recordDispute(provider.name, dispute);
      if (!recorded.ok) processingError = recorded.error ?? "Dispute not recorded";
    }
  } catch (error) {
    processingError = error instanceof Error ? error.message : "Unknown processing error";
  }

  if (event.providerEventId) {
    await admin
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString(), error: processingError })
      .eq("provider", provider.name)
      .eq("provider_event_id", event.providerEventId);
  }

  if (processingError) {
    console.error("Webhook processing error:", event.reference, processingError);
  }

  // Always acknowledge — retries can't fix a processing bug, and the event
  // is durably recorded for replay if needed.
  return NextResponse.json({ received: true });
}

/**
 * Settlements are recorded for reporting only. Paylance does not move this
 * money — it lands in the creator's own bank account directly.
 */
async function recordSettlement(
  providerName: string,
  event: {
    providerEventId: string | null;
    providerSubaccountId: string | null;
    amountKobo: number | null;
  }
) {
  const admin = createAdminClient();
  const subaccountId = event.providerSubaccountId;

  if (!subaccountId || event.amountKobo === null) return;

  const { data: account } = await admin
    .from("payout_accounts")
    .select("creator_id")
    .eq("provider_subaccount_id", subaccountId)
    .maybeSingle();

  if (!account) return;

  await admin.from("settlements").upsert(
    {
      creator_id: account.creator_id,
      provider: providerName,
      provider_settlement_id: event.providerEventId,
      amount_kobo: event.amountKobo,
      status: "success",
      settled_at: new Date().toISOString(),
    },
    { onConflict: "provider,provider_settlement_id" }
  );
}
