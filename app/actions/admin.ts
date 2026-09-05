"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, recordAdminAction } from "@/lib/admin";
import { getPaymentProvider } from "@/lib/payments";
import type { AdminRole } from "@/lib/admin-roles";

/**
 * Everything an admin can CHANGE.
 *
 * THE SHAPE OF EVERY ACTION HERE IS THE SAME, AND THAT IS THE POINT:
 *
 *   1. requireAdmin(capability)  — throws if the role can't, server-side.
 *   2. read the current value    — so the log can say what it replaced.
 *   3. make the change.
 *   4. recordAdminAction(...)    — after it lands, always.
 *
 * Step 1 is not "the UI hides the button". A support user who guesses the
 * URL and posts the form gets refused here, which is the only place a
 * refusal counts.
 *
 * Step 2 exists because "admin suspended this organiser" is half a
 * record. "Suspended, from ok, at 14:02, because <reason>" is the whole
 * one, and you cannot reconstruct the first half after the fact.
 */

function fail(e: unknown) {
  const message = e instanceof Error ? e.message : "That didn't work.";
  return { success: false as const, error: message };
}

// ── Event state ─────────────────────────────────────────────────

const EVENT_STATES = ["ok", "flagged", "suspended", "cancelled"] as const;
type EventState = (typeof EVENT_STATES)[number];

export async function setEventState(
  eventId: string,
  state: EventState,
  reason: string
) {
  try {
    const admin = await requireAdmin("write:event_state");
    if (!EVENT_STATES.includes(state)) return fail(new Error("Unknown state."));
    if (state !== "ok" && !reason.trim()) {
      return fail(new Error("Say why. It goes in the log."));
    }

    const db = createAdminClient();
    const { data: before } = await db
      .from("events")
      .select("id, title, admin_state, publish_status")
      .eq("id", eventId)
      .maybeSingle();
    if (!before) return fail(new Error("Event not found."));

    const patch: Record<string, unknown> = { admin_state: state };

    // Suspending has to actually stop sales, not just colour a badge.
    // Cancelling likewise. Publish status is the organiser's switch, so
    // admin_state is kept separately and the public gate reads both —
    // otherwise an organiser un-suspends themselves by pressing publish.
    if (state === "suspended" || state === "cancelled") {
      patch.publish_status = "draft";
    }

    const { error } = await db.from("events").update(patch).eq("id", eventId);
    if (error) return fail(new Error("Could not change that event."));

    await recordAdminAction({
      admin,
      action: `event.${state}`,
      subjectType: "event",
      subjectId: eventId,
      subjectLabel: before.title,
      previousValue: { admin_state: before.admin_state, publish_status: before.publish_status },
      newValue: patch,
      reason: reason.trim() || null,
    });

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}`);
    return { success: true as const };
  } catch (e) {
    return fail(e);
  }
}

// ── Organiser account state ─────────────────────────────────────

const ACCOUNT_STATES = ["ok", "flagged", "restricted", "suspended"] as const;
type AccountState = (typeof ACCOUNT_STATES)[number];

export async function setOrganiserState(
  organiserId: string,
  state: AccountState,
  reason: string
) {
  try {
    const admin = await requireAdmin("write:organiser_state");
    if (!ACCOUNT_STATES.includes(state)) return fail(new Error("Unknown state."));
    if (state !== "ok" && !reason.trim()) {
      return fail(new Error("Say why. It goes in the log."));
    }

    const db = createAdminClient();
    const { data: before } = await db
      .from("profiles")
      .select("id, account_state, handle, first_name, last_name, box_office_name")
      .eq("id", organiserId)
      .maybeSingle();
    if (!before) return fail(new Error("Organiser not found."));

    const { error } = await db
      .from("profiles")
      .update({ account_state: state })
      .eq("id", organiserId);
    if (error) return fail(new Error("Could not change that account."));

    // Suspending the person has to take their events off sale too.
    // Leaving them selling would make the suspension cosmetic, and money
    // would keep arriving for an organiser we have decided not to trust.
    let eventsPulled = 0;
    if (state === "suspended") {
      const { data: pulled } = await db
        .from("events")
        .update({ publish_status: "draft", admin_state: "suspended" })
        .eq("creator_id", organiserId)
        .eq("publish_status", "published")
        .select("id");
      eventsPulled = pulled?.length ?? 0;
    }

    await recordAdminAction({
      admin,
      action: `organiser.${state}`,
      subjectType: "organiser",
      subjectId: organiserId,
      subjectLabel:
        before.box_office_name ||
        [before.first_name, before.last_name].filter(Boolean).join(" ") ||
        before.handle,
      previousValue: { account_state: before.account_state },
      newValue: { account_state: state, events_pulled: eventsPulled },
      reason: reason.trim() || null,
    });

    revalidatePath("/admin/organisers");
    revalidatePath(`/admin/organisers/${organiserId}`);
    return { success: true as const, eventsPulled };
  } catch (e) {
    return fail(e);
  }
}

// ── Notes ───────────────────────────────────────────────────────

export async function addAdminNote(
  subjectType: "organiser" | "event" | "order" | "customer",
  subjectId: string,
  body: string
) {
  try {
    const admin = await requireAdmin("write:notes");
    const text = body.trim();
    if (!text) return fail(new Error("Write something first."));
    if (text.length > 4000) return fail(new Error("Too long — keep it under 4000."));

    const db = createAdminClient();
    const { error } = await db.from("admin_notes").insert({
      subject_type: subjectType,
      subject_id: subjectId,
      author_id: admin.userId,
      author_email: admin.email,
      body: text,
    });
    if (error) return fail(new Error("Could not save that note."));

    // A note is not a state change, so it is not audited as one — the
    // note itself is the record, and it already carries who and when.
    revalidatePath(`/admin/${subjectType}s/${subjectId}`);
    return { success: true as const };
  } catch (e) {
    return fail(e);
  }
}

// ── Admin users ─────────────────────────────────────────────────

const ROLES = ["super_admin", "operations", "finance", "support"] as const;

export async function setAdminRole(userId: string, role: AdminRole, reason: string) {
  try {
    const admin = await requireAdmin("write:admins");
    if (!ROLES.includes(role)) return fail(new Error("Unknown role."));

    const db = createAdminClient();
    const { data: before } = await db
      .from("platform_admins")
      .select("user_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!before) return fail(new Error("That person isn't an admin."));

    // You cannot demote yourself out of the ability to promote anyone
    // back. One misclick would otherwise leave the platform with nobody
    // who can add an admin, recoverable only in the SQL editor.
    if (userId === admin.userId && role !== "super_admin") {
      return fail(
        new Error("You can't take super admin off yourself — ask another super admin.")
      );
    }

    const { error } = await db
      .from("platform_admins")
      .update({ role })
      .eq("user_id", userId);
    if (error) return fail(new Error("Could not change that role."));

    await recordAdminAction({
      admin,
      action: "admin.role_changed",
      subjectType: "admin",
      subjectId: userId,
      previousValue: { role: before.role },
      newValue: { role },
      reason: reason.trim() || null,
    });

    revalidatePath("/admin/admins");
    return { success: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function removeAdmin(userId: string, reason: string) {
  try {
    const admin = await requireAdmin("write:admins");
    if (userId === admin.userId) {
      return fail(new Error("You can't remove yourself."));
    }

    const db = createAdminClient();
    const { data: before } = await db
      .from("platform_admins")
      .select("user_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!before) return fail(new Error("That person isn't an admin."));

    // Never leave the platform with no super admin. The audit table also
    // refuses to let their history be deleted, so the record of what they
    // did survives the removal.
    if (before.role === "super_admin") {
      const { count } = await db
        .from("platform_admins")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "super_admin");
      if ((count ?? 0) <= 1) {
        return fail(new Error("That's the last super admin. Promote somebody else first."));
      }
    }

    const { error } = await db.from("platform_admins").delete().eq("user_id", userId);
    if (error) return fail(new Error("Could not remove that admin."));

    await recordAdminAction({
      admin,
      action: "admin.removed",
      subjectType: "admin",
      subjectId: userId,
      previousValue: { role: before.role },
      newValue: null,
      reason: reason.trim() || null,
    });

    revalidatePath("/admin/admins");
    return { success: true as const };
  } catch (e) {
    return fail(e);
  }
}

// ── Refunds ─────────────────────────────────────────────────────

/**
 * Send a buyer their money back.
 *
 * THE ORDER OF OPERATIONS IS THE SAFETY. A row is written as "processing"
 * BEFORE the provider is called, and updated after. If the process dies
 * mid-call, the record says a refund was attempted — which is
 * recoverable — rather than saying nothing, which would leave money moved
 * and no trace of who moved it.
 *
 * Refunding is capped at what was actually taken, minus anything already
 * refunded. Two admins clicking at once is the case that matters: without
 * the check, a ₦20,000 order could be refunded ₦40,000.
 */
export async function refundOrder(orderId: string, amountKobo: number, reason: string) {
  try {
    const admin = await requireAdmin("write:money");
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
      return fail(new Error("Enter a real amount."));
    }
    if (!reason.trim()) return fail(new Error("Say why. It goes in the log."));

    const db = createAdminClient();
    const { data: order } = await db
      .from("orders")
      .select("id, reference, status, gross_kobo, event_id, creator_id, buyer_email")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return fail(new Error("Order not found."));
    if (order.status !== "paid") {
      return fail(new Error(`That order is ${order.status}, not paid. Nothing to refund.`));
    }

    // What has already gone back, counting attempts still in flight — a
    // refund that is processing is money committed, not money available.
    const { data: existing } = await db
      .from("refunds")
      .select("amount_kobo, status")
      .eq("order_id", orderId);

    const alreadyOut = (existing ?? [])
      .filter((r: any) => r.status !== "failed")
      .reduce((s: number, r: any) => s + Number(r.amount_kobo ?? 0), 0);

    const gross = Number(order.gross_kobo ?? 0);
    if (alreadyOut + amountKobo > gross) {
      return fail(
        new Error(
          `That order took ${gross} kobo and ${alreadyOut} is already refunded. ` +
            `The most you can send back now is ${gross - alreadyOut}.`
        )
      );
    }

    const { data: row, error: insertError } = await db
      .from("refunds")
      .insert({
        order_id: orderId,
        event_id: order.event_id,
        creator_id: order.creator_id,
        amount_kobo: amountKobo,
        reason: reason.trim(),
        status: "processing",
        requested_by: admin.userId,
        requested_by_role: "admin",
      })
      .select("id")
      .single();

    if (insertError || !row) return fail(new Error("Could not start that refund."));

    const provider = getPaymentProvider();
    const result = await provider.refund({
      reference: order.reference,
      amountKobo,
      reason: reason.trim(),
    });

    await db
      .from("refunds")
      .update({
        status: result.ok ? result.status : "failed",
        provider_refund_id: result.providerRefundId ?? null,
        failure_reason: result.ok ? null : (result.error ?? "The provider refused it."),
        completed_at: result.status === "refunded" ? new Date().toISOString() : null,
      })
      .eq("id", row.id);

    // The order only becomes "refunded" when the whole of it has gone
    // back. A partial refund leaves it paid, because it still is.
    if (result.ok && alreadyOut + amountKobo >= gross) {
      await db.from("orders").update({ status: "refunded" }).eq("id", orderId);
    }

    await recordAdminAction({
      admin,
      action: result.ok ? "order.refunded" : "order.refund_failed",
      subjectType: "order",
      subjectId: orderId,
      subjectLabel: order.reference,
      previousValue: { status: order.status, already_refunded_kobo: alreadyOut },
      newValue: { amount_kobo: amountKobo, provider_status: result.status },
      reason: reason.trim(),
    });

    revalidatePath("/admin/refunds");
    revalidatePath(`/admin/orders/${orderId}`);

    if (!result.ok) return fail(new Error(result.error ?? "The provider refused it."));
    return { success: true as const, status: result.status };
  } catch (e) {
    return fail(e);
  }
}

// ── The attention queue ─────────────────────────────────────────

const ITEM_STATES = ["open", "investigating", "resolved", "ignored"] as const;

export async function setAttentionStatus(
  itemId: string,
  status: (typeof ITEM_STATES)[number],
  note: string
) {
  try {
    // Working the queue is operations, not finance — anybody who can act
    // on events and organisers can also say an issue is handled.
    const admin = await requireAdmin("write:event_state");
    if (!ITEM_STATES.includes(status)) return fail(new Error("Unknown status."));

    const db = createAdminClient();
    const { data: before } = await db
      .from("attention_items")
      .select("id, status, title")
      .eq("id", itemId)
      .maybeSingle();
    if (!before) return fail(new Error("That item is gone."));

    const done = status === "resolved" || status === "ignored";
    const { error } = await db
      .from("attention_items")
      .update({
        status,
        resolved_by: done ? admin.userId : null,
        resolved_note: note.trim() || null,
        resolved_at: done ? new Date().toISOString() : null,
      })
      .eq("id", itemId);

    if (error) return fail(new Error("Could not update that."));

    await recordAdminAction({
      admin,
      action: `attention.${status}`,
      subjectType: "order",
      subjectId: itemId,
      subjectLabel: before.title,
      previousValue: { status: before.status },
      newValue: { status },
      reason: note.trim() || null,
    });

    revalidatePath("/admin/attention");
    revalidatePath("/admin");
    return { success: true as const };
  } catch (e) {
    return fail(e);
  }
}

// ── Platform settings ───────────────────────────────────────────

/**
 * Limits that live in the database rather than in environment
 * variables, so changing one is not a redeploy.
 *
 * Super admin only. These are the numbers that decide how much a
 * stranger can take before anybody looks at them — a level above
 * suspending one account.
 */
export async function updatePlatformSettings(input: {
  newOrganiserCapKobo: number;
  newOrganiserMaxDaysAhead: number;
  splitWindowHours: number;
  signupsOpen: boolean;
}) {
  try {
    const admin = await requireAdmin("write:admins");

    const cap = Math.max(0, Math.floor(input.newOrganiserCapKobo));
    const days = Math.max(0, Math.floor(input.newOrganiserMaxDaysAhead));
    const hours = Math.min(720, Math.max(1, Math.floor(input.splitWindowHours)));

    const db = createAdminClient();
    const { data: before } = await db
      .from("platform_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    const next = {
      id: true,
      new_organiser_cap_kobo: cap,
      new_organiser_max_days_ahead: days,
      split_window_hours: hours,
      signups_open: input.signupsOpen,
      updated_by: admin.userId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await db.from("platform_settings").upsert(next, { onConflict: "id" });
    if (error) {
      return fail(
        new Error(
          error.message?.includes("platform_settings")
            ? "Run setup.sql first — the settings table isn't there yet."
            : "Could not save those settings."
        )
      );
    }

    await recordAdminAction({
      admin,
      action: "settings.updated",
      subjectType: "admin",
      subjectId: "platform",
      subjectLabel: "Platform settings",
      previousValue: before
        ? {
            cap_kobo: before.new_organiser_cap_kobo,
            days_ahead: before.new_organiser_max_days_ahead,
            split_hours: before.split_window_hours,
            signups_open: before.signups_open,
          }
        : null,
      newValue: {
        cap_kobo: cap,
        days_ahead: days,
        split_hours: hours,
        signups_open: input.signupsOpen,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true as const };
  } catch (e) {
    return fail(e);
  }
}

// ── Support actions on an order ─────────────────────────────────

/**
 * Send somebody their tickets again.
 *
 * The commonest support call there is: a buyer deleted the message, or
 * gave an email with a typo they have since corrected elsewhere. This
 * re-runs the SAME delivery the webhook uses rather than a second,
 * slightly-different copy of it — so what they get now is exactly what
 * they should have got then.
 *
 * It reissues nothing. The tickets already exist; this only tells them
 * about the ones they have, which is why support can do it and why it
 * cannot go wrong.
 */
export async function resendTickets(orderId: string) {
  try {
    // Deliberately the lowest bar in the file. A support user helping a
    // buyer at 9pm should not need to wake a super admin, and the worst
    // outcome of getting it wrong is a duplicate email.
    const admin = await requireAdmin("write:notes");

    const db = createAdminClient();
    const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return fail(new Error("Order not found."));
    if (order.status !== "paid") {
      return fail(new Error(`That order is ${order.status}. There is nothing to send.`));
    }

    const { data: tickets } = await db
      .from("tickets")
      .select("id, code, ticket_type_id")
      .eq("order_id", orderId);

    if (!tickets?.length) {
      return fail(
        new Error("No tickets exist on this order yet — that is the problem to fix, not delivery.")
      );
    }

    const { deliverTickets } = await import("@/lib/orders");
    await deliverTickets(order, tickets as any);

    await recordAdminAction({
      admin,
      action: "order.tickets_resent",
      subjectType: "order",
      subjectId: orderId,
      subjectLabel: order.reference,
      newValue: { tickets: tickets.length, to: order.buyer_email },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true as const, count: tickets.length };
  } catch (e) {
    return fail(e);
  }
}

/** Put an order in front of a human, from wherever you noticed it. */
export async function flagOrder(orderId: string, note: string) {
  try {
    const admin = await requireAdmin("write:notes");
    if (!note.trim()) return fail(new Error("Say what looks wrong."));

    const db = createAdminClient();
    const { data: order } = await db
      .from("orders")
      .select("id, reference, event_id, creator_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return fail(new Error("Order not found."));

    const { raiseAttention } = await import("@/lib/disputes");
    await raiseAttention({
      kind: "flagged_by_admin",
      severity: "high",
      title: `Flagged for review — ${order.reference}`,
      detail: `${admin.email ?? "An admin"}: ${note.trim()}`,
      dedupeKey: `flag:${orderId}`,
      subjectType: "order",
      subjectId: orderId,
      orderId,
      eventId: order.event_id,
      creatorId: order.creator_id,
    });

    await recordAdminAction({
      admin,
      action: "order.flagged",
      subjectType: "order",
      subjectId: orderId,
      subjectLabel: order.reference,
      reason: note.trim(),
    });

    revalidatePath("/admin/attention");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true as const };
  } catch (e) {
    return fail(e);
  }
}
