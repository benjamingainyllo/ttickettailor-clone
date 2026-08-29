import type { Metadata } from "next";
import { formatKobo } from "@/lib/money";

/**
 * The link preview for an event.
 *
 * Lives here rather than in the page because a Next.js page file may only
 * export a small fixed set of things — and because a pure function with no
 * database behind it can actually be checked.
 */

/** What the preview needs, once it has been read from the database. */
export interface PreviewEvent {
  id: string;
  title: string;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  cover_image_url?: string | null;
  fromKobo: number | null;
  hostName: string | null;
}

/**
 * Turn an event into the card a group chat will show.
 *
 * Pulled out as a pure function so the formatting — which is where the bugs
 * live — can be checked without a database in front of it.
 */
export function buildEventMetadata(event: PreviewEvent, origin: string): Metadata {
  // Date, place and price, in the order somebody scanning a group chat reads
  // them. Whatever is missing is left out rather than shown blank.
  const when = event.date
    ? new Date(event.date).toLocaleDateString("en-NG", {
        weekday: "short",
        day: "numeric",
        month: "long",
      })
    : null;

  const price =
    event.fromKobo === null
      ? null
      : event.fromKobo === 0
        ? "Free entry"
        : `Tickets from ${formatKobo(event.fromKobo)}`;

  const line = [when, event.time, event.location, price].filter(Boolean).join(" · ");

  const description = line || event.description?.slice(0, 160) || "Get your ticket.";
  // "Lagos Nights — Lagos Nights" when a promoter names the night after the
  // box office, which is common. Only add the host when it says something new.
  const sameName =
    event.hostName?.trim().toLowerCase() === event.title.trim().toLowerCase();
  const title =
    event.hostName && !sameName ? `${event.title} — ${event.hostName}` : event.title;

  const url = `${origin}/event/${event.id}`;
  const image = event.cover_image_url ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Paylance",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      // A big image is the point — a small one buys nothing in a group chat.
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

