"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureVisitorKey, readVisitorKey } from "@/lib/visitor";

/**
 * Saving an event you might go to.
 *
 * WHY THE SERVICE KEY. The visitor is a cookie, and row-level security
 * cannot check a cookie — a browser could claim any visitor key it liked
 * and delete other people's saves. So `event_interest` grants nothing to
 * anyone by policy, and every write comes through here, where the key is
 * read from an httpOnly cookie the page cannot forge and the row is
 * matched on it.
 *
 * WHY IT IS SAFE TO EXPOSE. The only thing this can do is add or remove
 * one row keyed to the caller's own cookie, on an event that is published.
 * It cannot read anyone else's saves, cannot name a visitor, and returns
 * nothing but a count and a boolean.
 *
 * WHAT IT DOES NOT PROTECT AGAINST. Someone clearing cookies in a loop
 * could inflate a number. That is worth knowing and not worth solving
 * today: the number is social proof on a discovery page, not a figure
 * anybody is paid on, and the alternatives all cost a real visitor
 * something — an account, a captcha, a stored IP.
 */

export interface InterestResult {
  ok: boolean;
  saved: boolean;
  count: number;
  error?: string;
}

export async function toggleInterest(eventId: string): Promise<InterestResult> {
  if (!eventId || typeof eventId !== "string") {
    return { ok: false, saved: false, count: 0, error: "No event given." };
  }

  const admin = createAdminClient();

  // Published only. A draft's id in a crafted request must not become a
  // way to find out that the draft exists.
  const { data: event } = await admin
    .from("events")
    .select("id, publish_status, interested_count")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.publish_status !== "published") {
    return { ok: false, saved: false, count: 0, error: "That event isn't on sale." };
  }

  const visitorKey = ensureVisitorKey();

  // A signed-in organiser's saves are stamped with their id as well, so a
  // future "your saved events" list can follow them between devices.
  // Nobody has to be signed in for any of this to work.
  let userId: string | null = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // No session is the normal case here, not a failure.
  }

  const { data: existing } = await admin
    .from("event_interest")
    .select("id")
    .eq("event_id", eventId)
    .eq("visitor_key", visitorKey)
    .maybeSingle();

  if (existing) {
    const { error } = await admin.from("event_interest").delete().eq("id", existing.id);
    if (error) {
      console.error("Could not remove interest:", error);
      return { ok: false, saved: true, count: Number(event.interested_count || 0), error: "Couldn't undo that." };
    }
  } else {
    const { error } = await admin
      .from("event_interest")
      .insert({ event_id: eventId, visitor_key: visitorKey, user_id: userId });

    // A unique-violation means two taps raced. The visitor's intent was
    // "saved", the row exists, and the count is already right — so this
    // is a success, not an error.
    if (error && error.code !== "23505") {
      console.error("Could not save interest:", error);
      return { ok: false, saved: false, count: Number(event.interested_count || 0), error: "Couldn't save that." };
    }
  }

  // Re-read rather than adding one locally: the trigger owns the number,
  // and a count computed in two places is a count that will disagree.
  const { data: after } = await admin
    .from("events")
    .select("interested_count")
    .eq("id", eventId)
    .maybeSingle();

  revalidatePath("/explore");
  revalidatePath(`/event/${eventId}`);

  return {
    ok: true,
    saved: !existing,
    count: Number(after?.interested_count ?? 0),
  };
}

/**
 * The count and this browser's state for one event.
 *
 * Read from a client component on mount rather than threaded through the
 * event loader, because the answer depends on a cookie and the event
 * itself is cacheable. Tolerant of an un-migrated database: no column
 * means nobody has saved anything, which is true.
 */
export async function getInterest(
  eventId: string
): Promise<{ count: number; saved: boolean }> {
  if (!eventId) return { count: 0, saved: false };

  const admin = createAdminClient();
  const visitorKey = readVisitorKey();

  try {
    const [{ data: event }, mine] = await Promise.all([
      admin.from("events").select("interested_count").eq("id", eventId).maybeSingle(),
      visitorKey
        ? admin
            .from("event_interest")
            .select("id")
            .eq("event_id", eventId)
            .eq("visitor_key", visitorKey)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      count: Number(event?.interested_count ?? 0),
      saved: Boolean(mine.data),
    };
  } catch {
    return { count: 0, saved: false };
  }
}

/** Which of these the current browser has saved. Empty when it has none. */
export async function savedEventIds(eventIds: readonly string[]): Promise<Set<string>> {
  const visitorKey = readVisitorKey();
  if (!visitorKey || eventIds.length === 0) return new Set();

  const admin = createAdminClient();
  const { data } = await admin
    .from("event_interest")
    .select("event_id")
    .eq("visitor_key", visitorKey)
    .in("event_id", eventIds as string[]);

  return new Set((data ?? []).map((r) => r.event_id as string));
}
