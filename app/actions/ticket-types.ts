"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseNairaInput } from "@/lib/money";

/**
 * Ticket tiers — "Early Bird", "General Admission", "VIP".
 *
 * Writes go through the caller's own session, so the "Creators manage own
 * ticket types" policy is what actually authorises them; the ownership
 * check here is for a clear error message, not for security.
 *
 * Prices are parsed from free text on the server. The browser never sends
 * a kobo amount — it sends what the organiser typed.
 */

export interface TicketTypeInput {
  name: string;
  description?: string;
  /** Free text as typed: "5,000", "₦5000", "0". */
  price: string;
  /** Blank means unlimited. */
  quantity?: string;
  maxPerOrder?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

function parseInput(input: TicketTypeInput) {
  const name = input.name?.trim();
  if (!name) return { ok: false as const, error: "Give this ticket type a name." };

  const priceKobo = parseNairaInput(input.price ?? "0");
  if (priceKobo === null) return { ok: false as const, error: "That price isn't a valid amount." };

  let quantity: number | null = null;
  const rawQuantity = (input.quantity ?? "").trim();
  if (rawQuantity !== "") {
    const parsed = Number(rawQuantity);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      return { ok: false as const, error: "How many is not a whole number." };
    }
    quantity = parsed;
  }

  let maxPerOrder = 10;
  const rawMax = (input.maxPerOrder ?? "").trim();
  if (rawMax !== "") {
    const parsed = Number(rawMax);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      return { ok: false as const, error: "Max per order must be at least 1." };
    }
    maxPerOrder = parsed;
  }

  return {
    ok: true as const,
    values: {
      name,
      description: input.description?.trim() || null,
      price_kobo: priceKobo,
      quantity,
      max_per_order: maxPerOrder,
    },
  };
}

/** The database refuses a paid tier on a published event with no bank connected. */
function friendlyError(message: string): string {
  if (message.includes("bank account")) {
    return "Connect a bank account before selling a paid ticket type.";
  }
  return message;
}

export async function createTicketType(
  eventId: string,
  input: TicketTypeInput
): Promise<ActionResult> {
  const parsed = parseInput(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const { data: event } = await supabase
    .from("events")
    .select("id, creator_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.creator_id !== user.id) {
    return { success: false, error: "That event isn't yours." };
  }

  // New tiers go to the bottom of the list.
  const { data: last } = await supabase
    .from("ticket_types")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("ticket_types").insert({
    event_id: eventId,
    ...parsed.values,
    sort_order: Number(last?.sort_order ?? -1) + 1,
  });

  if (error) return { success: false, error: friendlyError(error.message) };

  revalidatePath("/events");
  return { success: true };
}

export async function updateTicketType(
  ticketTypeId: string,
  input: TicketTypeInput
): Promise<ActionResult> {
  const parsed = parseInput(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const existing = await loadOwnedTier(supabase, ticketTypeId, user.id);
  if (!existing.ok) return { success: false, error: existing.error };

  // Selling 40 and then setting the cap to 20 would misreport the event as
  // having capacity left. Refuse rather than silently accept it.
  if (
    parsed.values.quantity !== null &&
    parsed.values.quantity < Number(existing.tier.sold_count ?? 0)
  ) {
    return {
      success: false,
      error: `You've already sold ${existing.tier.sold_count}. The limit can't be lower than that.`,
    };
  }

  const { error } = await supabase
    .from("ticket_types")
    .update(parsed.values)
    .eq("id", ticketTypeId);

  if (error) return { success: false, error: friendlyError(error.message) };

  revalidatePath("/events");
  return { success: true };
}

/**
 * Tiers are hidden rather than deleted once anything has sold — the
 * tickets already issued point at this row for their tier name, and the
 * order history has to keep making sense.
 */
export async function removeTicketType(ticketTypeId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const existing = await loadOwnedTier(supabase, ticketTypeId, user.id);
  if (!existing.ok) return { success: false, error: existing.error };

  const hasSold = Number(existing.tier.sold_count ?? 0) > 0;

  const { error } = hasSold
    ? await supabase.from("ticket_types").update({ status: "hidden" }).eq("id", ticketTypeId)
    : await supabase.from("ticket_types").delete().eq("id", ticketTypeId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/events");
  return { success: true };
}

export async function restoreTicketType(ticketTypeId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const existing = await loadOwnedTier(supabase, ticketTypeId, user.id);
  if (!existing.ok) return { success: false, error: existing.error };

  const { error } = await supabase
    .from("ticket_types")
    .update({ status: "active" })
    .eq("id", ticketTypeId);

  if (error) return { success: false, error: friendlyError(error.message) };

  revalidatePath("/events");
  return { success: true };
}

async function loadOwnedTier(
  supabase: ReturnType<typeof createClient>,
  ticketTypeId: string,
  userId: string
) {
  const { data: tier } = await supabase
    .from("ticket_types")
    .select("id, sold_count, event_id, events!inner(creator_id)")
    .eq("id", ticketTypeId)
    .maybeSingle();

  if (!tier) return { ok: false as const, error: "That ticket type no longer exists." };

  const creatorId = (tier as any).events?.creator_id;
  if (creatorId !== userId) return { ok: false as const, error: "That ticket type isn't yours." };

  return { ok: true as const, tier };
}
