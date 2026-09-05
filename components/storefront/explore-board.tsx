import Link from "next/link";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Sparkle, Squiggle, Star } from "@/components/marketing/doodles";
import { ExploreCard } from "@/components/storefront/explore-card";
import type { CityBlock } from "@/lib/explore";

/**
 * Explore, as a shape.
 *
 * THE LAYOUT ANSWERS TO HOW MUCH THERE IS. A three-column grid is right
 * for a page with forty events and catastrophic for a page with one: it
 * left a single small card in the top-left and two columns of black
 * screen, which reads as a broken page rather than as an early one. So
 * the column count and the card size are both computed from the number of
 * events — one event gets a large card across the width, four get two
 * columns, twenty get three.
 *
 * Split from the page so the layout can be rendered against made-up
 * events in a browser without a database — the only way to check that a
 * long title, a missing cover and a one-event page all behave before an
 * organiser finds out for us.
 */

const label =
  "text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-faint)]";

export function ExploreBoard({ blocks, total }: { blocks: CityBlock[]; total: number }) {
  // Few events: fewer, bigger columns. The grid earns its third column
  // only when there is enough to fill it.
  const cols = total <= 3 ? 1 : total <= 8 ? 2 : 3;
  const size = total <= 6 ? "lg" : "sm";
  // NOTE the min-w-0 on every grid item below: a grid child defaults to
  // min-width:auto and will not shrink below its own content, so a card
  // with a fixed-width poster pushed the column straight past the right
  // edge of a phone.
  //
  // The single-column case is capped for readability but NOT centred. An
  // mx-auto here put one card in the middle of the screen while the
  // heading above it started at the left margin — the same two-left-edges
  // problem the hero already had.
  const gridClass =
    cols === 1 ? "max-w-2xl" : cols === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3";

  const lead = blocks.slice(0, cols);
  const rest = blocks.slice(cols);

  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      {/* ══════════════ Hero ══════════════ */}
      <section className="relative overflow-hidden border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-5 py-14 sm:px-10 sm:py-20 lg:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(60% 70% at 12% 0%, rgba(255,106,69,0.55) 0%, rgba(255,106,69,0) 62%), radial-gradient(50% 60% at 88% 10%, rgba(221,187,245,0.35) 0%, rgba(221,187,245,0) 60%)",
          }}
        />
        {/* Both live in the right-hand third. At left-[8%] the star landed
            in the middle of the paragraph and read as a typo. */}
        <Sparkle className="absolute right-[12%] top-[22%] hidden h-5 w-5 text-[var(--marker)]/60 lg:block" />
        <Star className="absolute right-[28%] bottom-[24%] hidden h-4 w-4 text-[var(--coral)]/50 lg:block" />

        <div className="relative mx-auto max-w-7xl">
          <p className={label}>Explore</p>
          <h1 className="mt-3 text-[40px] font-extrabold leading-[0.96] tracking-[-0.04em] sm:text-[64px]">
            What&apos;s on,
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              and who is behind it.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-[var(--on-ground-soft)]">
            {total > 0
              ? `${total.toLocaleString("en-NG")} ${total === 1 ? "event" : "events"} selling on Paylance right now. Tickets in a couple of taps — no app, no account needed to buy.`
              : "Every event selling on Paylance shows up here — parties, concerts, workshops, church programmes. Nothing is on sale yet, so this page is empty and honest about it."}
          </p>

          {blocks.length > 1 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {blocks.slice(0, 8).map((b) => (
                <a
                  key={b.city.key}
                  href={`#${b.city.key}`}
                  className="flex h-10 items-center rounded-full border border-[var(--hairline-firm)] px-4 text-[13px] font-bold text-[var(--on-ground-soft)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                >
                  {b.city.name}
                  <span className="ml-2 text-[var(--on-ground-faint)]">{b.events.length}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════ Nothing yet ══════════════ */}
      {blocks.length === 0 && (
        <section className="px-5 py-20 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <Squiggle className="h-6 w-24 text-[var(--coral)]/50" />
            <h2 className="mt-5 text-[26px] font-extrabold tracking-[-0.03em]">
              Nothing on sale yet
            </h2>
            <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-[var(--on-ground-soft)]">
              The moment an organiser publishes a paid or free event, it appears
              here with its date, its city and who is putting it on. Be the
              first — it takes about four minutes and costs nothing to list.
            </p>
            <div className="mt-8 flex">
              <StartCta />
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ The cities that lead ══════════════ */}
      {lead.length > 0 && (
        <section className="px-5 py-12 sm:px-10 sm:py-16 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <div className={`grid gap-x-8 gap-y-12 ${gridClass}`}>
            {lead.map((block) => (
              <div key={block.city.key} id={block.city.key} className="min-w-0 scroll-mt-24">
                <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-[var(--hairline)] pb-3">
                  <h2 className="text-[28px] font-extrabold lowercase leading-none tracking-[-0.04em] sm:text-[34px]">
                    {block.city.name}
                  </h2>
                  <span className="shrink-0 text-[12.5px] text-[var(--on-ground-faint)]">
                    {block.events.length} {block.events.length === 1 ? "event" : "events"}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {block.events.slice(0, 8).map((e) => (
                    <ExploreCard key={e.id} event={e} size={size} />
                  ))}
                </div>

                {block.events.length > 8 && (
                  <p className="mt-4 text-[13px] text-[var(--on-ground-faint)]">
                    and {block.events.length - 8} more in {block.city.name}
                  </p>
                )}
              </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ Everywhere else ══════════════ */}
      {rest.length > 0 && (
        <section className="border-t border-[var(--hairline)] bg-[var(--ground-deep)] px-5 py-12 sm:px-10 sm:py-16 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <p className={label}>Also happening in</p>

            <div className="mt-6 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
              {rest.map((block) => (
                <div key={block.city.key} id={block.city.key} className="min-w-0 scroll-mt-24">
                  <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-[var(--hairline)] pb-2.5">
                    <h3 className="text-[20px] font-extrabold tracking-[-0.02em]">
                      {block.city.name}
                    </h3>
                    <span className="shrink-0 text-[12px] text-[var(--on-ground-faint)]">
                      {block.events.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {block.events.slice(0, 4).map((e) => (
                      <ExploreCard key={e.id} event={e} />
                    ))}
                  </div>
                  {block.events.length > 4 && (
                    <p className="mt-3 text-[12.5px] text-[var(--on-ground-faint)]">
                      and {block.events.length - 4} more
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ For organisers ══════════════ */}
      {blocks.length > 0 && (
        <section className="border-t border-[var(--hairline)] px-5 py-14 sm:px-10 sm:py-16 lg:px-16">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-5">
            <h2 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">
              Putting something on?{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
                list it here.
              </span>
            </h2>
            <p className="max-w-xl text-[15.5px] leading-relaxed text-[var(--on-ground-soft)]">
              Publishing puts your event on this page and gives you one link to
              share. Money from every ticket lands in your own bank account as
              it sells — Paylance never holds it.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <StartCta />
              <Link
                href="/pricing"
                className="flex h-10 items-center text-[13px] font-semibold text-[var(--on-ground-soft)] underline underline-offset-4 hover:text-[var(--on-ground)]"
              >
                What it costs
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
