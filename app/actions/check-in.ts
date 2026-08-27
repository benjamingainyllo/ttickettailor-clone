"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeTicketCode } from "@/lib/tickets";

/**
 * The door.
 *
 * Admitting somebody is a guarded UPDATE from 'valid' to 'checked_in',
 * so two phones scanning the same ticket at the same moment cannot both
 * be told to let them in — exactly one wins and the other is told it was
 * already used, which is the answer that matters at a door.
 */

export type CheckInOutcome =
  | "admitted"
  | "already_checked_in"
  | "not_found"
  | "wrong_event"
  | "not_yours"
  | "void";

export interface CheckInResult {
  outcome: CheckInOutcome;
  message: string;
  ticket?: {
    code: string;
    holderName: string | null;
    ticketTypeName: string | null;
    seatIndex: number;
    checkedInAt: string | null;
  };
}

export async function checkInTicket(
  eventId: string,
  rawCode: string
): Promise<CheckInResult> {
  const code = normalizeTicketCode(extractCode(rawCode));
  if (!code) {
    return { outcome: "not_found", message: "That isn't a ticket code." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { outcome: "not_yours", message: "You need to be signed in." };

  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, code, event_id, creator_id, holder_name, ticket_type_name, seat_index, status, checked_in_at")
    .eq("code", code)
    .maybeSingle();

  if (!ticket) {
    return { outcome: "not_found", message: "No ticket with that code." };
  }

  // Checked before the event match, so someone else's ticket never reveals
  // which event it belongs to.
  if (ticket.creator_id !== user.id) {
    return { outcome: "not_yours", message: "That ticket isn't for one of your events." };
  }

  const summary = {
    code: ticket.code,
    holderName: ticket.holder_name,
    ticketTypeName: ticket.ticket_type_name,
    seatIndex: Number(ticket.seat_index ?? 1),
    checkedInAt: ticket.checked_in_at,
  };

  if (ticket.event_id !== eventId) {
    return {
      outcome: "wrong_event",
      message: "Valid ticket — but for a different event.",
      ticket: summary,
    };
  }

  if (ticket.status === "void" || ticket.status === "refunded") {
    return {
      outcome: "void",
      message: ticket.status === "refunded" ? "This ticket was refunded." : "This ticket was cancelled.",
      ticket: summary,
    };
  }

  if (ticket.status === "checked_in") {
    return {
      outcome: "already_checked_in",
      message: `Already used${
        ticket.checked_in_at ? ` at ${new Date(ticket.checked_in_at).toLocaleTimeString()}` : ""
      }.`,
      ticket: summary,
    };
  }

  const now = new Date().toISOString();

  // Guarded on 'valid' — this is the whole double-scan defence.
  const { data: admitted } = await admin
    .from("tickets")
    .update({ status: "checked_in", checked_in_at: now, checked_in_by: user.id })
    .eq("id", ticket.id)
    .eq("status", "valid")
    .select("checked_in_at")
    .maybeSingle();

  if (!admitted) {
    // Another scanner got there in the interval between our read and write.
    return {
      outcome: "already_checked_in",
      message: "Already used — someone just scanned it.",
      ticket: summary,
    };
  }

  return {
    outcome: "admitted",
    message: "Let them in.",
    ticket: { ...summary, checkedInAt: admitted.checked_in_at },
  };
}

/** Undo a check-in, for the inevitable mis-scan. */
export async function undoCheckIn(code: string): Promise<CheckInResult> {
  const normalized = normalizeTicketCode(extractCode(code));
  if (!normalized) return { outcome: "not_found", message: "That isn't a ticket code." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { outcome: "not_yours", message: "You need to be signed in." };

  const admin = createAdminClient();
  const { data: reverted } = await admin
    .from("tickets")
    .update({ status: "valid", checked_in_at: null, checked_in_by: null })
    .eq("code", normalized)
    .eq("creator_id", user.id)
    .eq("status", "checked_in")
    .select("code")
    .maybeSingle();

  if (!reverted) {
    return { outcome: "not_found", message: "Nothing to undo for that ticket." };
  }

  return { outcome: "admitted", message: "Check-in undone." };
}

export interface DoorStats {
  admitted: number;
  total: number;
}

export async function getDoorStats(eventId: string): Promise<DoorStats> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { admitted: 0, total: 0 };

  const admin = createAdminClient();

  const [{ count: total }, { count: admitted }] = await Promise.all([
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("creator_id", user.id),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("creator_id", user.id)
      .eq("status", "checked_in"),
  ]);

  return { admitted: admitted ?? 0, total: total ?? 0 };
}

/**
 * A scan can hand us the bare code or a full ticket URL, depending on
 * what generated the QR. Take the last path segment when it looks like a
 * link, so both work without the door staff needing to care.
 */
function extractCode(input: string): string {
  const value = (input ?? "").trim();
  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? "";
  } catch {
    return value;
  }
}
