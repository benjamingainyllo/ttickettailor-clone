/**
 * Roles, and what each one may do.
 *
 * DELIBERATELY NOT server-only. The sidebar and the role picker are
 * client components and need the names and the list; they must be able to
 * import this without dragging the service-role client into a browser
 * bundle. Everything here is pure data and pure functions — no secrets, no
 * database, nothing that reading it could leak.
 *
 * The enforcement lives in lib/admin.ts, which IS server-only. This file
 * says what the rules are; that file is where they are applied.
 */

export type AdminRole = "super_admin" | "operations" | "finance" | "support";

export const ADMIN_ROLES: AdminRole[] = [
  "super_admin",
  "operations",
  "finance",
  "support",
];

/**
 * WHY A CAPABILITY LIST AND NOT `if (role === "finance")` AT THE CALL
 * SITE. A permission scattered across forty screens is a permission
 * nobody can audit. Every gate names a capability; this table is the only
 * place a capability maps to a role, so "who can suspend an organiser" is
 * answerable by reading one object.
 *
 * Read access to money is separated from the ability to move it, and
 * support — the role most people get — can look at anything needed to
 * help a buyer and change nothing that touches money or standing.
 */
export type Capability =
  /** See buyer names, emails and phone numbers. */
  | "read:customers"
  /** See takings, fees and settlements across the platform. */
  | "read:finance"
  /** Suspend, flag or cancel an event. */
  | "write:event_state"
  /** Restrict or restore an organiser's account. */
  | "write:organiser_state"
  /** Move, hold or retry money. Nothing implements this yet. */
  | "write:money"
  /** Add or remove admins and change their roles. */
  | "write:admins"
  /** Append an internal note. */
  | "write:notes";

const CAPABILITIES: Record<AdminRole, Capability[]> = {
  super_admin: [
    "read:customers", "read:finance", "write:event_state",
    "write:organiser_state", "write:money", "write:admins", "write:notes",
  ],
  operations: [
    "read:customers", "read:finance", "write:event_state",
    "write:organiser_state", "write:notes",
  ],
  finance: ["read:customers", "read:finance", "write:money", "write:notes"],
  support: ["read:customers", "write:notes"],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super admin",
  operations: "Operations",
  finance: "Finance",
  support: "Support",
};

export const ROLE_BLURBS: Record<AdminRole, string> = {
  super_admin: "Everything, including adding and removing admins.",
  operations: "Events, organisers and investigations. Cannot add admins.",
  finance: "Money, payouts and refunds. Cannot suspend accounts.",
  support: "Look anything up to help a buyer. Changes nothing.",
};

export function roleCan(role: AdminRole, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}

/** An unrecognised role resolves to the least it could possibly mean. */
export function normaliseRole(value: unknown): AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole) ? (value as AdminRole) : "support";
}
