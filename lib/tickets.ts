import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Kobo } from "@/lib/money";

/**
 * A ticket is the thing somebody holds up at the door.
 *
 * It is issued once, at settlement, and never before — an unpaid order
 * has no tickets. Issuance is idempotent on `(order_id, seat_index)`, so a
 * replayed webhook and a slow checkout-return page can both call this for
 * the same order without minting a second set of admissions.
 */

/**
 * Alphabet for ticket codes: Crockford base32 with the ambiguous
 * characters removed. No 0/O, no 1/I/L — these get read aloud down a
 * phone line and typed in by hand at a door with bad signal.
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_GROUPS = 2;
const CODE_GROUP_LENGTH = 4;

/**
 * A short, unguessable, human-readable code: `PL-7K4M-9XQ2`.
 *
 * 30^8 is a little over 6.5 x 10^11, which makes guessing a valid code
 * impractical, and the UNIQUE constraint on the column is what actually
 * guarantees no two tickets collide.
 */
export function generateTicketCode(): string {
  const groups: string[] = [];

  for (let g = 0; g < CODE_GROUPS; g++) {
    let group = "";
    for (let i = 0; i < CODE_GROUP_LENGTH; i++) {
      group += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    groups.push(group);
  }

  return `PL-${groups.join("-")}`;
}

/** Accept a code however it was typed: lowercase, spaced, dashes missing. */
export function normalizeTicketCode(input: string): string {
  const cleaned = (input ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = cleaned.startsWith("PL") ? cleaned.slice(2) : cleaned;

  if (body.length !== CODE_GROUPS * CODE_GROUP_LENGTH) return "";

  const groups: string[] = [];
  for (let i = 0; i < body.length; i += CODE_GROUP_LENGTH) {
    groups.push(body.slice(i, i + CODE_GROUP_LENGTH));
  }
  return `PL-${groups.join("-")}`;
}

interface IssuableOrder {
  id: string;
  creator_id: string;
  event_id: string | null;
  ticket_type_id: string | null;
  item_title: string | null;
  quantity: number | null;
  gross_kobo: number | string | null;
  buyer_name: string | null;
  buyer_email: string | null;
}

export interface IssuedTicket {
  code: string;
  seat_index: number;
  ticket_type_name: string | null;
  price_kobo: Kobo;
}

export interface IssueTicketsSuccess {
  ok: true;
  tickets: IssuedTicket[];
  /**
   * True only for the caller that actually flipped `tickets_issued_at`
   * from null. Exactly one caller can win that, which makes it the right
   * thing to gate a confirmation email on.
   */
  firstIssue: boolean;
}

/**
 * Mint one ticket per admission on a paid order.
 *
 * Returns every ticket on the order — including ones a previous call
 * already created — so the caller can send a confirmation email without
 * having to know whether it won the race.
 */
export async function issueTicketsForOrder(
  order: IssuableOrder
): Promise<IssueTicketsSuccess | { ok: false; error: string }> {
  if (!order.event_id) {
    // Offers don't have admissions. Not an error — just nothing to do.
    return { ok: true, tickets: [], firstIssue: false };
  }

  const admin = createAdminClient();
  const quantity = Math.max(1, Number(order.quantity ?? 1));
  const grossKobo = Number(order.gross_kobo ?? 0);
  const unitPriceKobo = Math.round(grossKobo / quantity);

  let ticketTypeName: string | null = order.item_title ?? null;
  if (order.ticket_type_id) {
    const { data: tier } = await admin
      .from("ticket_types")
      .select("name")
      .eq("id", order.ticket_type_id)
      .maybeSingle();
    if (tier?.name) ticketTypeName = tier.name;
  }

  // Up to three attempts, purely to survive a code collision. The unique
  // index is the authority; this just re-rolls and tries again.
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = Array.from({ length: quantity }, (_, i) => ({
      code: generateTicketCode(),
      order_id: order.id,
      event_id: order.event_id,
      creator_id: order.creator_id,
      ticket_type_id: order.ticket_type_id,
      ticket_type_name: ticketTypeName,
      price_kobo: unitPriceKobo,
      holder_name: order.buyer_name,
      holder_email: order.buyer_email,
      seat_index: i + 1,
    }));

    // Duplicates on (order_id, seat_index) mean another caller already
    // issued this order. That is a success, not a failure.
    const { error } = await admin
      .from("tickets")
      .upsert(rows, { onConflict: "order_id,seat_index", ignoreDuplicates: true });

    if (!error) break;

    const isCodeCollision = error.code === "23505" && error.message?.includes("code");
    if (!isCodeCollision) {
      console.error("Ticket issuance failed:", error);
      return { ok: false, error: error.message };
    }
    if (attempt === 2) {
      return { ok: false, error: "Could not allocate unique ticket codes." };
    }
  }

  // Guarded on null so exactly one caller can claim the first issue.
  const { data: claimed } = await admin
    .from("orders")
    .update({ tickets_issued_at: new Date().toISOString() })
    .eq("id", order.id)
    .is("tickets_issued_at", null)
    .select("id")
    .maybeSingle();

  const { data: tickets, error: readError } = await admin
    .from("tickets")
    .select("code, seat_index, ticket_type_name, price_kobo")
    .eq("order_id", order.id)
    .order("seat_index");

  if (readError) return { ok: false, error: readError.message };

  return {
    ok: true,
    firstIssue: Boolean(claimed),
    tickets: (tickets ?? []).map((t) => ({
      code: t.code,
      seat_index: t.seat_index,
      ticket_type_name: t.ticket_type_name,
      price_kobo: Number(t.price_kobo ?? 0),
    })),
  };
}
