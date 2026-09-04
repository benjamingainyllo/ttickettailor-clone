import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normaliseRole, roleCan as roleCanPure, ROLE_LABELS as LABELS,
  type AdminRole, type Capability,
} from "@/lib/admin-roles";

/**
 * The gate on everything the platform owner can see.
 *
 * This is the most dangerous check in the product, because behind it is
 * every organiser's revenue and every buyer's email address. Three
 * decisions matter and none of them are stylistic:
 *
 *   It runs on the server. `import "server-only"` makes that a build error
 *   rather than a review note — pull this into a client component and the
 *   build fails, instead of shipping a check anybody can edit in dev tools.
 *
 *   Membership lives in the database. Adding or removing an admin is a row,
 *   not a deploy.
 *
 *   The session is read with the CALLER's client, so it is their real
 *   cookie being checked. Membership is then read with the service key,
 *   because a non-admin cannot see that table at all — "the read returned
 *   nothing" would otherwise be the right answer for the wrong reason.
 */

export type { AdminRole, Capability };
export { ROLE_LABELS, ROLE_BLURBS, ADMIN_ROLES, roleCan } from "@/lib/admin-roles";

export interface AdminIdentity {
  userId: string;
  email: string | null;
  role: AdminRole;
}

/** The signed-in admin, or null. Null means "not an admin", always. */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  // A failed read is not permission. Anything but a row that exists is no.
  if (error) {
    console.error("Could not check platform admin membership:", error);
    return null;
  }
  if (!data) return null;

  // A typo in a database column must never widen access.
  return {
    userId: user.id,
    email: user.email ?? null,
    role: normaliseRole((data as any).role),
  };
}

export async function isPlatformAdmin(): Promise<boolean> {
  return (await getAdminIdentity()) !== null;
}

/**
 * The gate every admin server action must pass through.
 *
 * Throws rather than returning false. A permission check whose result can
 * be ignored is a permission check that will eventually be ignored — this
 * one stops the action dead.
 */
export async function requireAdmin(capability?: Capability): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) throw new Error("Not an admin.");
  if (capability && !roleCanPure(identity.role, capability)) {
    throw new Error(`Your role (${LABELS[identity.role]}) can't do that.`);
  }
  return identity;
}

/**
 * Write down what an admin did.
 *
 * Called by the action AFTER the change lands, with the value it replaced.
 * Never inside a "if it worked" branch that could be skipped — an action
 * that changes something and doesn't log it is the thing this whole table
 * exists to prevent.
 *
 * Uses the service role, because the audit table has no INSERT policy at
 * all: nothing an admin can reach through a screen can write, edit or
 * delete their own trail.
 */
export async function recordAdminAction(params: {
  admin: AdminIdentity;
  action: string;
  subjectType: "organiser" | "event" | "order" | "customer" | "admin" | "payout";
  subjectId: string;
  subjectLabel?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      admin_id: params.admin.userId,
      admin_email: params.admin.email,
      action: params.action,
      subject_type: params.subjectType,
      subject_id: params.subjectId,
      subject_label: params.subjectLabel ?? null,
      previous_value: params.previousValue ?? null,
      new_value: params.newValue ?? null,
      reason: params.reason ?? null,
    });
  } catch (error) {
    // Loud, because a silent audit failure is the worst outcome here: the
    // change happened and nothing remembers it.
    console.error("AUDIT WRITE FAILED", params.action, params.subjectId, error);
  }
}
