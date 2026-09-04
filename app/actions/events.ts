"use server";

import { createClient } from "@/lib/supabase/server";

/** A ticket tier as the buyer sees it. Never carries sales figures. */
export interface PublicTicketType {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  maxPerOrder: number;
  soldOut: boolean;
  /** Seats left, or null when the tier is unlimited. */
  remaining: number | null;
  notYetOpen: boolean;
  closed: boolean;
  available: boolean;
  salesStart: string | null;
}

/**
 * Public event lookup for the guest-facing page.
 *
 * Returns the host alongside the event: a guest is deciding whether to trust
 * a person with money, so the page can't render without knowing who that is.
 */
/** Merchandise as a buyer sees it. No stock counts, only availability. */
export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  imageUrl: string | null;
  variants: string[] | null;
  maxPerOrder: number;
  remaining: number | null;
  soldOut: boolean;
}

/** A name on the flyer. No login, no permissions, no share of the money. */
export interface PublicCohost {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
}

export async function getEventById(id: string) {
  const supabase = createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("publish_status", "published")
    .maybeSingle();

  if (error) {
    console.error("Error fetching event:", error);
    return { success: false as const, error: error.message, event: null, host: null, ticketTypes: [], products: [], cohosts: [] };
  }

  if (!event) {
    return { success: false as const, error: "Event not found", event: null, host: null, ticketTypes: [], products: [], cohosts: [] };
  }

  const { data: host } = await supabase
    .from("profiles")
    .select("handle, first_name, last_name, avatar_url")
    .eq("id", event.creator_id)
    .maybeSingle();

  // What's actually on sale. `sold_count` is never sent to the browser —
  // how many a rival organiser has sold is nobody else's business — only
  // whether seats remain, and how many can go in one order.
  const { data: tiers } = await supabase
    .from("ticket_types")
    .select("id, name, description, price_kobo, quantity, sold_count, max_per_order, sales_start, sales_end")
    .eq("event_id", event.id)
    .eq("status", "active")
    .order("sort_order");

  const now = Date.now();

  const ticketTypes: PublicTicketType[] = (tiers ?? []).map((tier) => {
    const remaining =
      tier.quantity === null || tier.quantity === undefined
        ? null
        : Math.max(0, Number(tier.quantity) - Number(tier.sold_count ?? 0));

    const notYetOpen = Boolean(tier.sales_start && new Date(tier.sales_start).getTime() > now);
    const closed = Boolean(tier.sales_end && new Date(tier.sales_end).getTime() < now);

    return {
      id: tier.id,
      name: tier.name,
      description: tier.description,
      priceKobo: Number(tier.price_kobo ?? 0),
      maxPerOrder: Number(tier.max_per_order ?? 10),
      soldOut: remaining === 0,
      remaining,
      notYetOpen,
      closed,
      available: !notYetOpen && !closed && remaining !== 0,
      salesStart: tier.sales_start,
    };
  });

  // Merchandise sold alongside the ticket. sold_count is never sent to the
  // browser — only whether stock remains, and how many can go in one order.
  const { data: merchRows } = await supabase
    .from("event_products")
    .select("id, name, description, price_kobo, image_url, variants, quantity, sold_count, max_per_order")
    .eq("event_id", event.id)
    .eq("status", "active")
    .order("sort_order");

  const products: PublicProduct[] = (merchRows ?? []).map((row) => {
    const remaining =
      row.quantity === null || row.quantity === undefined
        ? null
        : Math.max(0, Number(row.quantity) - Number(row.sold_count ?? 0));

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      priceKobo: Number(row.price_kobo ?? 0),
      imageUrl: row.image_url,
      variants: row.variants ?? null,
      maxPerOrder: Number(row.max_per_order ?? 10),
      remaining,
      soldOut: remaining === 0,
    };
  });

  // Its own query, and a tolerant one. The table arrives with PART 9 of
  // setup.sql, and an organiser who hasn't run it yet must still be able to
  // sell tickets — a missing decoration table cannot be allowed to take a
  // published event offline.
  let cohosts: PublicCohost[] = [];
  try {
    const { data: cohostRows } = await supabase
      .from("event_cohosts")
      .select("id, name, handle, avatar_url")
      .eq("event_id", id)
      .order("sort_order", { ascending: true });
    cohosts = (cohostRows ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      handle: c.handle ?? null,
      avatarUrl: c.avatar_url ?? null,
    }));
  } catch {
    cohosts = [];
  }

  return { success: true as const, event, host: host ?? null, ticketTypes, products, cohosts };
}
