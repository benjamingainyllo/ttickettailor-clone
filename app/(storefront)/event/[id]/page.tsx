import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { buildEventMetadata } from "@/lib/event-preview";
import { EventCheckoutPage } from "./event-page";

/**
 * A thin server wrapper whose only job is the link preview.
 *
 * This page used to be a client component all the way down, which meant it
 * could not export metadata at all — so every event link pasted into a
 * WhatsApp group, an Instagram bio or a group chat showed the generic
 * Paylance homepage card instead of the event.
 *
 * That matters more here than almost anywhere else in the product. The whole
 * distribution model is "share one link", and /features promises in writing
 * that the link preview carries the cover art, the date and the price. It
 * did not. Now it does.
 *
 * The checkout itself is still a client component, imported below — only the
 * metadata needed to move.
 */

async function loadEventForPreview(id: string) {
  // Read with the admin client rather than the caller's session: this runs
  // with no cookies during metadata generation, and a link preview is
  // fetched by a crawler that is signed in as nobody.
  try {
    const admin = createAdminClient();

    const { data: event } = await admin
      .from("events")
      .select("id, title, description, date, time, location, cover_image_url, publish_status, creator_id")
      .eq("id", id)
      .maybeSingle();

    if (!event || event.publish_status !== "published") return null;

    // The cheapest active tier, which is what "from ₦x" should quote.
    const { data: cheapest } = await admin
      .from("ticket_types")
      .select("price_kobo")
      .eq("event_id", id)
      .eq("status", "active")
      .order("price_kobo")
      .limit(1)
      .maybeSingle();

    const { data: host } = await admin
      .from("profiles")
      .select("box_office_name, first_name")
      .eq("id", event.creator_id)
      .maybeSingle();

    return {
      ...event,
      fromKobo: cheapest ? Number(cheapest.price_kobo ?? 0) : null,
      hostName: host?.box_office_name || host?.first_name || null,
    };
  } catch (error) {
    // A preview is never worth failing the page over. Falling through to the
    // site-wide defaults is a worse card, not a broken one.
    console.error("Could not build the event link preview:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = await loadEventForPreview(params.id);

  if (!event) {
    return { title: "Event", description: "Get your ticket." };
  }

  return buildEventMetadata(event, siteUrl());
}

export default function Page({ params }: { params: { id: string } }) {
  return <EventCheckoutPage params={params} />;
}
