import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { cityOf, ELSEWHERE, ONLINE, type City } from "@/lib/cities";

/**
 * What the public Explore page is allowed to know.
 *
 * READ WITH THE SERVICE KEY, PUBLISHED ONLY, PUBLIC COLUMNS ONLY. This runs
 * for a visitor who is signed in as nobody, so it cannot use the caller's
 * session — the same reason the event link-preview loader uses the admin
 * client. The service key bypasses row-level security, which means the
 * filter is not a convenience here, it is the entire access control: the
 * `publish_status = 'published'` clause below is what stops a draft
 * appearing on a public page, and the select lists are what stop an email
 * address travelling with it. Nothing in this file may select a column a
 * stranger should not see, and nothing may drop that filter.
 *
 * The service key itself never leaves the server: this module is
 * server-only, so importing it from a client component fails the build
 * rather than shipping the key to a browser.
 */

export interface ExploreEvent {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  cover: string | null;
  hostName: string;
  hostHandle: string | null;
  /** Cheapest active tier, in kobo. Null when the event has no tier. */
  fromKobo: number | null;
  /** Real admissions issued. */
  going: number;
  /** People who tapped save. A real signal now — see PART 14 of setup.sql. */
  interested: number;
  /** Whether THIS browser saved it. Filled in by the page, not the query. */
  saved: boolean;
}

export interface CityBlock {
  city: City;
  events: ExploreEvent[];
}

/** Today in Lagos terms, as YYYY-MM-DD. */
function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Every published, still-to-happen event, grouped by city.
 *
 * UNDATED EVENTS ARE INCLUDED, LAST. An organiser who has published
 * without fixing a date has still published; hiding them would make a page
 * that looks broken to the person who put the event up.
 */
/**
 * The interest counter, asked for on its own and allowed to fail.
 *
 * `interested_count` arrives with PART 14 of setup.sql, and a database
 * that has not run it yet does not have the column. PostgREST answers an
 * unknown column with an error, not a null — so selecting it alongside
 * the rest would take the whole Explore page down until the migration
 * ran. Asked for separately, a missing column costs a zero.
 */
async function readInterestedCounts(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    const { data, error } = await admin
      .from("events")
      .select("id, interested_count")
      .in("id", ids);
    if (error) return out;
    for (const row of data ?? []) {
      out.set(row.id as string, num((row as Record<string, unknown>).interested_count));
    }
  } catch {
    // Not yet migrated. Zero is the honest answer, not a failure.
  }
  return out;
}

export async function loadExplore(now = new Date()): Promise<{
  blocks: CityBlock[];
  total: number;
}> {
  const admin = createAdminClient();
  const today = todayIso(now);

  const { data: events, error } = await admin
    .from("events")
    .select("id, title, date, time, location, cover_image_url, creator_id, publish_status")
    .eq("publish_status", "published")
    .or(`date.gte.${today},date.is.null`)
    .order("date", { ascending: true, nullsFirst: false })
    .limit(500);

  if (error) {
    console.error("Explore could not read events:", error);
    return { blocks: [], total: 0 };
  }

  const rows = (events ?? []).filter((e) => e.publish_status === "published");
  if (rows.length === 0) return { blocks: [], total: 0 };

  const ids = rows.map((e) => e.id as string);
  const creatorIds = Array.from(
    new Set(rows.map((e) => e.creator_id as string).filter(Boolean))
  );

  const [{ data: tiers }, { data: hosts }, interestedBy] = await Promise.all([
    admin
      .from("ticket_types")
      .select("event_id, price_kobo, sold_count, status")
      .in("event_id", ids),
    // Only the three columns a stranger already sees on a public page.
    creatorIds.length > 0
      ? admin.from("profiles").select("id, handle, box_office_name, first_name").in("id", creatorIds)
      : Promise.resolve({ data: [] as any[] }),
    readInterestedCounts(admin, ids),
  ]);

  const cheapest = new Map<string, number>();
  const sold = new Map<string, number>();
  for (const t of tiers ?? []) {
    const id = t.event_id as string;
    sold.set(id, (sold.get(id) ?? 0) + num(t.sold_count));
    if (t.status !== "active") continue;
    const price = num(t.price_kobo);
    const best = cheapest.get(id);
    if (best === undefined || price < best) cheapest.set(id, price);
  }

  const hostOf = new Map<string, { name: string; handle: string | null }>();
  for (const p of hosts ?? []) {
    hostOf.set(p.id as string, {
      name:
        (p.box_office_name as string) ||
        (p.first_name as string) ||
        (p.handle as string) ||
        "A Paylance organiser",
      handle: (p.handle as string) ?? null,
    });
  }

  const byCity = new Map<string, CityBlock>();

  for (const e of rows) {
    const city = cityOf(e.location as string | null);
    const host = hostOf.get(e.creator_id as string);

    const item: ExploreEvent = {
      id: e.id as string,
      title: (e.title as string) || "Untitled event",
      date: (e.date as string) ?? null,
      time: (e.time as string) ?? null,
      location: (e.location as string) ?? null,
      cover: (e.cover_image_url as string) ?? null,
      hostName: host?.name ?? "A Paylance organiser",
      hostHandle: host?.handle ?? null,
      fromKobo: cheapest.get(e.id as string) ?? null,
      going: sold.get(e.id as string) ?? 0,
      interested: interestedBy.get(e.id as string) ?? 0,
      saved: false,
    };

    const block = byCity.get(city.key) ?? { city, events: [] };
    block.events.push(item);
    byCity.set(city.key, block);
  }

  for (const block of Array.from(byCity.values())) {
    block.events.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }

  // Busiest city first, because that is where a visitor is most likely to
  // find something. "Online" and "Everywhere else" are always last: they
  // are not places, and letting either lead would make the page look like
  // it could not tell where anything was.
  const blocks = Array.from(byCity.values()).sort((a, b) => {
    const rank = (c: City) => (c.key === ELSEWHERE.key ? 2 : c.key === ONLINE.key ? 1 : 0);
    return (
      rank(a.city) - rank(b.city) ||
      b.events.length - a.events.length ||
      a.city.name.localeCompare(b.city.name)
    );
  });

  return { blocks, total: rows.length };
}
