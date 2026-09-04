"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TITLE_STYLES, DEFAULT_TITLE_STYLE } from "@/lib/title-styles";

/**
 * Editing an event after it exists.
 *
 * WHY THIS IS A SERVER ACTION AND CREATE IS NOT. Creating an event can
 * only ever affect a row you are about to own. Editing can affect a row
 * somebody else owns, and a row that people have already bought tickets
 * to — so ownership is checked here, on the server, rather than left to
 * a row-level policy alone. Defence in depth: RLS would also stop it,
 * but the check that produces a readable error should not be the one
 * that lives in the database.
 *
 * WHAT THIS DELIBERATELY CANNOT CHANGE:
 *
 *  - price. An event carries price_kobo, but tickets are sold from
 *    ticket_types, and events.price_kobo is read only by the publish gate
 *    to decide whether a bank account is required. Editing it here would
 *    move the gate without moving a single ticket price, so the screen
 *    sends the organiser to the Tickets editor instead.
 *  - publish status, which has its own action and its own bank-account
 *    gate.
 *  - creator_id, obviously.
 */

const STYLE_IDS = new Set(TITLE_STYLES.map((s) => s.id));

export interface EventEditInput {
  id: string;
  title: string;
  titleStyle: string;
  hostNickname: string;
  date: string;
  time: string;
  location: string;
  mapLink: string;
  description: string;
  /** Only sent when the organiser picked a new one. */
  coverImageUrl?: string | null;
  cohosts: { name: string; handle: string }[];
}

export async function getEventForEdit(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const admin = createAdminClient();

  const { data: event, error } = await admin
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !event) return { ok: false as const, error: "Event not found." };
  if (event.creator_id !== user.id) {
    return { ok: false as const, error: "That isn't yours to edit." };
  }

  // Tolerant, because PART 9 of setup.sql may not have been run yet and a
  // missing decoration table must not make an event uneditable.
  let cohosts: { name: string; handle: string }[] = [];
  try {
    const { data } = await admin
      .from("event_cohosts")
      .select("name, handle")
      .eq("event_id", id)
      .order("sort_order", { ascending: true });
    cohosts = (data ?? []).map((c: any) => ({ name: c.name, handle: c.handle ?? "" }));
  } catch {
    cohosts = [];
  }

  // How many people already hold a ticket. This is the number that decides
  // whether moving the date is an edit or a broken promise, so the screen
  // needs it before the organiser starts typing, not after they save.
  const { count } = await admin
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id);

  return {
    ok: true as const,
    event,
    cohosts,
    ticketsIssued: count ?? 0,
  };
}

export async function updateEvent(input: EventEditInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "You need to be signed in." };

  const title = input.title.trim();
  if (!title) return { success: false as const, error: "An event needs a name." };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("events")
    .select("id, creator_id")
    .eq("id", input.id)
    .maybeSingle();

  if (!existing) return { success: false as const, error: "Event not found." };
  if (existing.creator_id !== user.id) {
    return { success: false as const, error: "That isn't yours to edit." };
  }

  const titleStyle = STYLE_IDS.has(input.titleStyle as never)
    ? input.titleStyle
    : DEFAULT_TITLE_STYLE;

  const patch: Record<string, unknown> = {
    title,
    title_style: titleStyle,
    host_nickname: input.hostNickname.trim() || null,
    // An empty date means "to be announced", which the public page already
    // renders. Writing "" into a DATE column is an error, not a blank.
    date: input.date || null,
    time: input.time.trim(),
    location: input.location.trim(),
    map_link: input.mapLink.trim(),
    description: input.description.trim(),
    updated_at: new Date().toISOString(),
  };

  // Undefined means "left alone". Null would mean "remove the cover", and
  // the screen never sends that — an organiser who wants a different image
  // picks one, and clearing it entirely is not a thing they asked for.
  if (input.coverImageUrl !== undefined && input.coverImageUrl !== null) {
    patch.cover_image_url = input.coverImageUrl;
  }

  const { error: updateError } = await admin
    .from("events")
    .update(patch)
    .eq("id", input.id);

  if (updateError) {
    // By far the likeliest cause, and the only one with a fix he can act on.
    const missingColumn =
      updateError.message?.includes("title_style") ||
      updateError.message?.includes("host_nickname");
    return {
      success: false as const,
      error: missingColumn
        ? "Your database needs updating first — run setup.sql, then try again."
        : "Could not save those changes.",
    };
  }

  // Cohosts are replaced wholesale rather than diffed: there are at most a
  // handful, they carry no identity anyone references, and a delete-then-
  // insert is far easier to reason about than a three-way merge.
  //
  // A failure here is reported but does not fail the save, because the
  // event edits above have already landed and telling the organiser their
  // whole edit failed would be a lie.
  const rows = input.cohosts
    .map((c) => ({ name: c.name.trim(), handle: c.handle.trim() }))
    .filter((c) => c.name.length > 0)
    .slice(0, 8);

  let cohostsSaved = true;
  try {
    await admin.from("event_cohosts").delete().eq("event_id", input.id);
    if (rows.length > 0) {
      const { error } = await admin.from("event_cohosts").insert(
        rows.map((c, i) => ({
          event_id: input.id,
          name: c.name,
          handle: c.handle || null,
          sort_order: i,
        }))
      );
      if (error) cohostsSaved = false;
    }
  } catch {
    cohostsSaved = false;
  }

  revalidatePath("/events");
  revalidatePath(`/event/${input.id}`);

  return { success: true as const, cohostsSaved };
}
