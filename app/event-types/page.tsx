import type { Metadata } from "next";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Sparkle, Star, Squiggle } from "@/components/marketing/doodles";
import { EVENT_TYPES } from "@/components/marketing/event-types";

export const metadata: Metadata = {
  title: "Every kind of event",
  description:
    "Concerts, club nights, festivals, conferences, workshops, church programmes, weddings. If people come through a door, Paylance sells the ticket — ₦200 flat, never a percentage.",
};

export default function EventTypesPage() {
  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      {/* ══════════════ Header ══════════════ */}
      <section className="relative overflow-hidden border-b-2 border-[var(--ink)] bg-[var(--paper-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <Sparkle className="absolute right-[12%] top-[22%] hidden h-5 w-5 text-[var(--coral)]/50 sm:block" />

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            Every kind of event
          </p>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[56px]">
            If people come
            <br />
            through a door,
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              we sell the ticket.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-[var(--ink-soft)]">
            Thirty people in a room or three thousand in a field. Free entry or
            ₦120,000 a table. Same tickets, same scanner, same flat ₦200 —
            and nothing at all when it&apos;s free.
          </p>
          <div className="mt-9 flex justify-center">
            <StartCta />
          </div>
        </div>
      </section>

      {/* ══════════════ The grid ══════════════ */}
      <section className="border-b-2 border-[var(--ink)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPES.map((type, i) => (
              <div
                key={type.name}
                className={`lp-block rounded-2xl p-6 lp-tilt-${(i % 4) + 1}`}
                style={{ background: type.tone }}
              >
                <h2 className="text-[18px] font-extrabold leading-tight tracking-tight text-[var(--ink)]">
                  {type.name}
                </h2>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
                  {type.blurb}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <p className="mx-auto max-w-md text-[16px] leading-relaxed text-[var(--ink-soft)]">
              Not on the list? It still works. There&apos;s nothing here that&apos;s
              specific to one kind of event — it&apos;s tickets, a link, and a
              scanner at the door.
            </p>
            <div className="mt-8 flex justify-center">
              <Squiggle className="h-4 w-28 text-[var(--coral)]" />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section className="relative overflow-hidden border-b-2 border-[var(--ink)] bg-gradient-to-br from-[#8B5CF6] via-[#F5568E] to-[#FF6A45] px-6 py-24 text-center sm:px-10 lg:px-16">
        <Star className="absolute bottom-[22%] right-[16%] hidden h-5 w-5 text-white/40 sm:block" />
        <div className="relative mx-auto max-w-xl">
          <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-tight text-white sm:text-[48px]">
            What are you
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              putting on?
            </span>
          </h2>
          <div className="mt-9">
            <StartCta />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
