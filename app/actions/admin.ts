"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, recordAdminAction } from "@/lib/admin";
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
