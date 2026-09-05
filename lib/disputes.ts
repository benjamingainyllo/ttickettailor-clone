import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedDispute } from "@/lib/payments/types";

/**
 * A chargeback landing.
 *
 * THE CLOCK IS THE WHOLE PROBLEM. Paystack gives sixteen hours to answer
 * a dispute and reminds every four until you do. Miss it and it is decided
 * against us by default, along with the full ticket price and an
 * arbitration fee. Before this existed, Paylance was never told a dispute
 * had happened at all — the first sign would have been money missing from
 * a settlement, long after the window closed.
 *
 * IDEMPOTENT BY THE PROVIDER'S ID. The reminder every four hours carries
 * the same dispute, so an upsert on (provider, provider_dispute_id) is
 * what stops one chargeback becoming six rows in the queue.
 */
export async function recordDispute(
  providerName: string,
  d: NormalizedDispute
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    // Join it to the sale if we can. A dispute we can't match to an order
    // is still worth recording — an unmatched chargeback is a worse
    // problem than a matched one, not a reason to drop the row.
    let order: any = null;
    if (d.reference) {
      const { data } = await admin
        .from("orders")
        .select("id, event_id, creator_id, gross_kobo")
        .eq("reference", d.reference)
        .maybeSingle();
      order = data ?? null;
    }

    const { error } = await admin.from("disputes").upsert(
      {
        provider: providerName,
        provider_dispute_id: d.providerDisputeId,
        provider_reference: d.reference,
        order_id: order?.id ?? null,
        event_id: order?.event_id ?? null,
        creator_id: order?.creator_id ?? null,
        amount_kobo: d.amountKobo || Number(order?.gross_kobo ?? 0) || 0,
        category: d.category,
        reason: d.reason,
        status: d.status,
        deadline_at: d.deadlineAt,
        updated_at: new Date().toISOString(),
        ...(d.status === "won" || d.status === "lost"
          ? { resolved_at: new Date().toISOString() }
          : {}),
      },
      { onConflict: "provider,provider_dispute_id" }
    );

    if (error) return { ok: false, error: error.message };

    // Put it in the attention queue too. The disputes screen is where you
    // work them; the queue is what makes sure somebody looks at all.
    await raiseAttention({
      kind: "dispute",
      severity: "critical",
      title: `Chargeback raised${d.reference ? ` on ${d.reference}` : ""}`,
      detail:
        `${d.reason ?? d.category ?? "No reason given"}. ` +
        `Sixteen hours to answer — after that it is decided against us.`,
      dedupeKey: `dispute:${providerName}:${d.providerDisputeId}`,
      orderId: order?.id ?? null,
      eventId: order?.event_id ?? null,
      creatorId: order?.creator_id ?? null,
      subjectType: "order",
      subjectId: order?.id ?? d.providerDisputeId,
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not record the dispute",
    };
  }
}

/**
 * Put something in front of a human, once.
 *
 * dedupe_key is the point. A detector that runs every ten minutes would
 * otherwise report the same stuck order every ten minutes; instead the
 * first sighting inserts and every one after that just moves last_seen_at,
 * so the queue shows how long a problem has been going on rather than how
 * many times it has been noticed.
 */
export async function raiseAttention(item: {
  kind: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail?: string | null;
  dedupeKey: string;
  subjectType?: string | null;
  subjectId?: string | null;
  eventId?: string | null;
  creatorId?: string | null;
  orderId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { error } = await admin.from("attention_items").upsert(
      {
        kind: item.kind,
        severity: item.severity,
        title: item.title,
        detail: item.detail ?? null,
        dedupe_key: item.dedupeKey,
        subject_type: item.subjectType ?? null,
        subject_id: item.subjectId ?? null,
        event_id: item.eventId ?? null,
        creator_id: item.creatorId ?? null,
        order_id: item.orderId ?? null,
        last_seen_at: now,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: false }
    );

    // A failure here must never take down whatever raised it. The worst
    // case is a missing queue entry, which is recoverable; a webhook that
    // 500s because the queue was busy is not.
    if (error) console.error("Could not raise attention item", item.dedupeKey, error);
  } catch (error) {
    console.error("Could not raise attention item", item.dedupeKey, error);
  }
}
