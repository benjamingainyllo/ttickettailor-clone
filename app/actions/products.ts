"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseNairaInput } from "@/lib/money";

/**
 * Merchandise sold alongside a ticket — a shirt, a programme, a drink token.
 *
 * Scoped to one event, so it appears on that event's page and dies with it.
 * Writes go through the caller's own session, which means the "Organisers
 * manage their own products" policy is what actually authorises them; the
 * ownership check here exists to produce a readable error, not for security.
 *
 * Prices are parsed from free text on the server. The browser never sends a
 * kobo amount — it sends what the organiser typed into the box.
 */

export interface ProductInput {
  name: string;
  description?: string;
  /** Free text as typed: "15,000", "₦15000". */
  price: string;
  /** Blank means unlimited. */
  quantity?: string;
  maxPerOrder?: string;
  /** Comma-separated: "S, M, L, XL". Blank means the item has no options. */
  variants?: string;
  /** Physical goods someone hands over at the door. */
  requiresCollection?: boolean;
  imageUrl?: string | null;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

function parseInput(input: ProductInput) {
  const name = input.name?.trim();
  if (!name) return { ok: false as const, error: "Give this item a name." };

  const priceKobo = parseNairaInput(input.price ?? "0");
  if (priceKobo === null) {
    return { ok: false as const, error: "That price isn't a valid amount." };
  }

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

  // "S, M, L" -> ['S','M','L']. Duplicates dropped, because a size listed
  // twice becomes two identical options in the buyer's dropdown.
  const variantList = (input.variants ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const variants = Array.from(new Set(variantList));

  return {
    ok: true as const,
    values: {
      name,
      description: input.description?.trim() || null,
      price_kobo: priceKobo,
      quantity,
      max_per_order: maxPerOrder,
      variants: variants.length > 0 ? variants : null,
      requires_collection: input.requiresCollection ?? true,
      image_url: input.imageUrl?.trim() || null,
    },
  };
}

/** Confirms the signed-in organiser owns the event these products hang off. */
async function assertOwnsEvent(eventId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to sign in." };

  const { data: event } = await supabase
    .from("events")
    .select("id, creator_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { ok: false as const, error: "That event no longer exists." };
  if (event.creator_id !== user.id) {
    return { ok: false as const, error: "That isn't your event." };
  }
  return { ok: true as const, supabase };
}

export async function createProduct(
  eventId: string,
  input: ProductInput
): Promise<ActionResult> {
  const owns = await assertOwnsEvent(eventId);
  if (!owns.ok) return { success: false, error: owns.error };

  const parsed = parseInput(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  // Append rather than insert at the top: an organiser who has arranged
  // their stall in a particular order does not want a new item jumping it.
  const { data: last } = await owns.supabase
    .from("event_products")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await owns.supabase.from("event_products").insert({
    event_id: eventId,
    sort_order: (last?.sort_order ?? -1) + 1,
    ...parsed.values,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { success: true };
}

export async function updateProduct(
  productId: string,
  input: ProductInput
): Promise<ActionResult> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("event_products")
    .select("id, event_id, sold_count")
    .eq("id", productId)
    .maybeSingle();

  if (!existing) return { success: false, error: "That item no longer exists." };

  const owns = await assertOwnsEvent(existing.event_id);
  if (!owns.ok) return { success: false, error: owns.error };

  const parsed = parseInput(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  // An allocation below what has already sold would make the organiser's own
  // numbers lie: the item would read as oversold and could never be restocked
  // back to truth.
  if (
    parsed.values.quantity !== null &&
    parsed.values.quantity < (existing.sold_count ?? 0)
  ) {
    return {
      success: false,
      error: `You've already sold ${existing.sold_count}. The limit can't be lower than that.`,
    };
  }

  const { error } = await owns.supabase
    .from("event_products")
    .update({ ...parsed.values, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${existing.event_id}`);
  return { success: true };
}

/**
 * Hide rather than delete once anything has sold.
 *
 * A deleted row would take its name off every past receipt with it, and the
 * order line only keeps a copy of the name — not the price history or the
 * link back. Hiding takes it off sale and leaves the record intact.
 */
export async function removeProduct(productId: string): Promise<ActionResult> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("event_products")
    .select("id, event_id, sold_count")
    .eq("id", productId)
    .maybeSingle();

  if (!existing) return { success: false, error: "That item no longer exists." };

  const owns = await assertOwnsEvent(existing.event_id);
  if (!owns.ok) return { success: false, error: owns.error };

  if ((existing.sold_count ?? 0) > 0) {
    const { error } = await owns.supabase
      .from("event_products")
      .update({ status: "hidden", updated_at: new Date().toISOString() })
      .eq("id", productId);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await owns.supabase
      .from("event_products")
      .delete()
      .eq("id", productId);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath(`/events/${existing.event_id}`);
  return { success: true };
}

export async function restoreProduct(productId: string): Promise<ActionResult> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("event_products")
    .select("id, event_id")
    .eq("id", productId)
    .maybeSingle();

  if (!existing) return { success: false, error: "That item no longer exists." };

  const owns = await assertOwnsEvent(existing.event_id);
  if (!owns.ok) return { success: false, error: owns.error };

  const { error } = await owns.supabase
    .from("event_products")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/events/${existing.event_id}`);
  return { success: true };
}

export interface DashboardProduct {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  quantity: number | null;
  soldCount: number;
  maxPerOrder: number;
  variants: string[] | null;
  requiresCollection: boolean;
  imageUrl: string | null;
  status: string;
}

export async function listProducts(eventId: string): Promise<DashboardProduct[]> {
  const owns = await assertOwnsEvent(eventId);
  if (!owns.ok) return [];

  const { data } = await owns.supabase
    .from("event_products")
    .select(
      "id, name, description, price_kobo, quantity, sold_count, max_per_order, variants, requires_collection, image_url, status"
    )
    .eq("event_id", eventId)
    .order("sort_order");

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceKobo: Number(p.price_kobo ?? 0),
    quantity: p.quantity === null ? null : Number(p.quantity),
    soldCount: Number(p.sold_count ?? 0),
    maxPerOrder: Number(p.max_per_order ?? 10),
    variants: p.variants ?? null,
    requiresCollection: Boolean(p.requires_collection),
    imageUrl: p.image_url,
    status: p.status,
  }));
}
