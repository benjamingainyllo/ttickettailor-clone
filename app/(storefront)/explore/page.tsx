import type { Metadata } from "next";
import { ExploreBoard } from "@/components/storefront/explore-board";
import { loadExplore } from "@/lib/explore";
import { savedEventIds } from "@/app/actions/interest";

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
 * Rendered per request, not cached.
 *
 * It was statically rebuilt every five minutes, which stopped being
 * possible the moment the page had to show whether YOU had saved
 * something: a cached page would hand one visitor's saved stars to
 * everybody. The counts still come from a single column, so this is four
 * small queries, and the alternative — caching the page and fetching the
 * stars from the browser afterwards — trades that for a visible flicker
 * on every card.
 */
export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { blocks, total } = await loadExplore();

  const saved = await savedEventIds(
    blocks.flatMap((b) => b.events.map((e) => e.id))
  );

  const marked = blocks.map((b) => ({
    ...b,
    events: b.events.map((e) => ({ ...e, saved: saved.has(e.id) })),
  }));

  return <ExploreBoard blocks={marked} total={total} />;
}
