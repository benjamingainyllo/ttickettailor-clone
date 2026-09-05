import type { Metadata } from "next";
import { ExploreBoard } from "@/components/storefront/explore-board";
import { loadExplore } from "@/lib/explore";

/**
 * Explore — every published event on Paylance, by city.
 *
 * THE PAGE IS ONLY AS GOOD AS THE EVENTS ON IT, AND IT SAYS SO. A
 * discovery page with three events that pretends to be a marketplace is
 * worse than one that admits it is new: the second reads as early, the
 * first reads as dead. So there is no filler, no fake "trending", no
 * skeleton grid padded out to look full. What exists is shown; what does
 * not is named.
 *
 * CITIES COME FROM THE ADDRESS TEXT, not from a column nobody has filled
 * in. See lib/cities.ts for why, and for the word-boundary matching that
 * keeps a Lagos party out of Aba.
 */

export const metadata: Metadata = {
  title: "Explore events",
  description:
    "Every event selling on Paylance right now — parties, concerts, workshops, conferences and church programmes, city by city. Find one, get a ticket in a couple of taps.",
};

/**
 * Rebuilt every five minutes rather than on every request.
 *
 * A public page that runs four database queries per visitor is a page that
 * falls over the first time an organiser's event goes round a group chat,
 * which is the exact moment it needs to work.
 */
export const revalidate = 300;

export default async function ExplorePage() {
  const { blocks, total } = await loadExplore();
  return <ExploreBoard blocks={blocks} total={total} />;
}
