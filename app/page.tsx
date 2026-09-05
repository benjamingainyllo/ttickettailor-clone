"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { EVENT_TYPES } from "@/components/marketing/event-types";
import { ArrowCurve, Circled, Sparkle, Squiggle, Star, Underline } from "@/components/marketing/doodles";
import { DoorMock, LinkMock, PayoutMock, TicketMock, TiersMock } from "@/components/marketing/mockups";
import {
  DEFAULT_PLATFORM_FEE_TYPE,
  DEFAULT_PLATFORM_FEE_VALUE,
  PLATFORM_FEE_CAP_KOBO,
  PLATFORM_FEE_FREE_BELOW_KOBO,
  calculatePlatformFeeKobo,
  formatKobo,
  koboToNaira,
  nairaToKobo,
} from "@/lib/money";
import { TYPICAL_LABEL, typicalFeeNaira } from "@/lib/competitor";

/** Highlighter stroke behind a word. */
function Mark({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="lp-mark" style={color ? ({ ["--mark-color" as any]: color }) : undefined}>
      <span>{children}</span>
    </span>
  );
}

/** The home page shows a taste; /event-types has the full list. */
const FEATURED_TYPES = EVENT_TYPES.slice(0, 9);

/**
 * The comparison the whole product rests on. One ticket, then two hundred.
 *
 * BOTH SIDES ARE COMPUTED, NEITHER IS TYPED IN. This page spent weeks
 * quoting the superseded band table — "from ₦200 a ticket, never a
 * percentage" — against a competitor at 5%, while the engine charged 4%
 * capped and the competitor charged 8% + ₦100. Every number was wrong and
 * the error ran the wrong way: it understated our own advantage by about
 * half, on the first page anybody reads. Ours now comes from the same
 * function that bills the organiser; theirs from lib/competitor.ts.
 */
const TICKET_PRICE = 20000;
const TICKET_COUNT = 200;
const PAYLANCE_PER_TICKET = koboToNaira(
  calculatePlatformFeeKobo(
    nairaToKobo(TICKET_PRICE),
    DEFAULT_PLATFORM_FEE_TYPE,
    DEFAULT_PLATFORM_FEE_VALUE
  )
);
const TYPICAL_PER_TICKET = typicalFeeNaira(TICKET_PRICE);

/** The pitch, in the engine's own numbers. */
const RATE_LABEL = `${DEFAULT_PLATFORM_FEE_VALUE / 100}%`;
const CAP_LABEL = formatKobo(PLATFORM_FEE_CAP_KOBO);
const FREE_BELOW_LABEL = formatKobo(PLATFORM_FEE_FREE_BELOW_KOBO);

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export default function LandingPage() {
  const paylanceTotal = PAYLANCE_PER_TICKET * TICKET_COUNT;
  const typicalTotal = TYPICAL_PER_TICKET * TICKET_COUNT;
  const difference = typicalTotal - paylanceTotal;

  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      {/* ══════════════ Hero ══════════════ */}
      <section className="relative overflow-hidden border-b border-[var(--hairline)]">
        {/* The room you're selling tickets to, not an illustration of it. */}
        <Image
          src="/hero-crowd.jpg"
          alt="A crowded dance floor under pink and orange lights"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Two scrims: one across everything so the whole frame sits back,
            one heavier on the left so the headline has real contrast to
            live on rather than fighting the brightest part of the photo. */}
        <div className="absolute inset-0 bg-[#120A14]/30" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#120A14]/88 via-[#120A14]/45 to-transparent"
          aria-hidden="true"
        />

        <div className="relative px-6 py-20 sm:px-10 sm:py-28 lg:px-16">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            <div>
              <span className="lp-block-soft inline-block rotate-[-1.5deg] rounded-full bg-[var(--paper)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ink)]">
                {RATE_LABEL} a ticket · never more than {CAP_LABEL}
              </span>

              <h1 className="mt-6 text-[46px] font-extrabold leading-[0.95] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.4)] sm:text-[72px]">
                Sell tickets.
                <br />
                Keep
                <br />
                <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
                  what you earn.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-white/90">
                {RATE_LABEL} of a ticket, and never more than {CAP_LABEL} however
                much it costs — so the fee stops growing where everyone else&apos;s
                keeps climbing. Under {FREE_BELOW_LABEL} a ticket, and on free
                events, we charge nothing at all. Your share splits off the
                moment someone pays and settles to your own bank. No wallet
                here, nothing to withdraw, nobody holding it until after the
                night.
              </p>

              <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <StartCta />
                <div className="flex items-center gap-2 text-[13px] font-semibold text-white/85">
                  <Check className="h-4 w-4" /> Free events cost nothing
                </div>
              </div>
            </div>

            {/* The product, floating over the room it works in. */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="lp-tilt-2">
                  <TicketMock />
                </div>
                <div className="lp-tilt-1 absolute -bottom-9 -left-16 hidden sm:block">
                  <div className="lp-block rounded-2xl bg-[#FFDE59] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink)]">
                      Your fee
                    </p>
                    {/* The mock above sells a ₦5,000 ticket. Our cut on it,
                        from the engine — not a number typed beside a picture. */}
                    <p className="text-[20px] font-extrabold text-[var(--ink)]">
                      {formatKobo(
                        calculatePlatformFeeKobo(
                          nairaToKobo(5000),
                          DEFAULT_PLATFORM_FEE_TYPE,
                          DEFAULT_PLATFORM_FEE_VALUE
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ The fee — the whole argument ══════════════ */}
      <section id="pricing" className="border-b border-[var(--hairline)] px-6 sm:px-10 lg:px-16 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-soft)]">
              The maths everyone else hides
            </p>
            <h2 className="mt-5 text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px]">
              A percentage punishes you
              <br />
              for <Mark color="var(--marker-pink)">selling well</Mark>
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[var(--on-ground-soft)]">
              The better your event does, the more a percentage platform takes. Ours
              doesn&apos;t move. Here&apos;s {TICKET_COUNT} tickets at {naira(TICKET_PRICE)}.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            <div className="lp-block lp-tilt-1 rounded-2xl bg-[#9BE3C0] p-7">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1B1512]/70">
                Paylance
              </p>
              <p className="mt-2 text-[42px] font-extrabold leading-none tracking-tight text-[var(--ink)]">
                {naira(paylanceTotal)}
              </p>
              <p className="mt-2 text-[13px] font-semibold text-[#1B1512]/70">
                in fees · {naira(PAYLANCE_PER_TICKET)} × {TICKET_COUNT} tickets
              </p>
              <div className="mt-5 border-t-2 border-[#1B1512]/15 pt-4">
                <p className="text-[12px] font-semibold text-[#1B1512]/70">You keep</p>
                <p className="text-[24px] font-extrabold text-[var(--ink)]">
                  {naira(TICKET_PRICE * TICKET_COUNT - paylanceTotal)}
                </p>
              </div>
            </div>

            <div className="lp-block-dark lp-tilt-3 rounded-2xl bg-[var(--ground-raised)] p-7">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-ground-soft)]">
                {TYPICAL_LABEL} platform
              </p>
              <p className="mt-2 text-[42px] font-extrabold leading-none tracking-tight text-[var(--on-ground-soft)]">
                {naira(typicalTotal)}
              </p>
              <p className="mt-2 text-[13px] font-semibold text-[var(--on-ground-soft)]">
                in fees · {TYPICAL_LABEL} a ticket
              </p>
              <div className="mt-5 border-t border-[var(--hairline)] pt-4">
                <p className="text-[12px] font-semibold text-[var(--on-ground-soft)]">You keep</p>
                <p className="text-[24px] font-extrabold text-[var(--on-ground-soft)]">
                  {naira(TICKET_PRICE * TICKET_COUNT - typicalTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-[18px] font-bold sm:text-[22px]">
              That&apos;s <Mark>{naira(difference)}</Mark> that stays with you.
            </p>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[var(--on-ground-soft)]">
              No signup fee. No monthly plan. Nothing at all if you don&apos;t sell —
              and nothing ever on a free event.
            </p>
            <div className="mt-8">
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center gap-2 text-[15px] font-bold text-[var(--on-ground)] underline decoration-[var(--coral)] decoration-2 underline-offset-4 hover:decoration-4"
              >
                See the full pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 flex justify-center">
              <Squiggle className="h-4 w-28 text-[var(--coral)]" />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ Event types ══════════════ */}
      <section id="who" className="border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
              However many
              <br />
              you&apos;re <Mark>letting in</Mark>
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[var(--on-ground-soft)]">
              Thirty people in a room or three thousand in a field — same
              tickets, same scanner, same {RATE_LABEL} — capped at {CAP_LABEL}.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_TYPES.map((type, i) => (
              <div
                key={type.name}
                className={`lp-block rounded-2xl p-6 lp-tilt-${(i % 4) + 1}`}
                style={{ background: type.tone }}
              >
                <h3 className="text-[18px] font-extrabold leading-tight tracking-tight text-[var(--ink)]">
                  {type.name}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
                  {type.blurb}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link
              href="/event-types"
              className="inline-flex h-11 items-center gap-2 text-[15px] font-bold text-[var(--on-ground)] underline decoration-[var(--coral)] decoration-2 underline-offset-4 hover:decoration-4"
            >
              See all {EVENT_TYPES.length} kinds of event
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════ How it works ══════════════ */}
      <section id="how" className="border-b border-[var(--hairline)] px-6 sm:px-10 lg:px-16 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="relative max-w-2xl">
            <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
              Three steps. Then you&apos;re selling.
            </h2>
            <Underline className="mt-2 h-3 w-56 text-[var(--coral)]" />
          </div>

          <div className="mt-14 space-y-16">
            {[
              {
                n: "01",
                title: "Set your ticket types",
                body: "Early Bird at one price, General at another, VIP at a third. Cap each one so it sells out on its own, and set how many a single person can buy. It saves as a draft — nothing goes public until you say so.",
                art: <TiersMock />,
              },
              {
                n: "02",
                title: "Share one link",
                body: "It goes in a bio, a status, a group chat. Buyers pick a tier, choose how many, pay by card or transfer, and get their tickets by email straight away. No account, no app, no download.",
                art: <LinkMock />,
              },
              {
                n: "03",
                title: "Scan them in",
                body: "Open the door page on your phone and point it at their QR. Green means let them in. If a code has already been used it says so — the same ticket can't get two people through.",
                art: <DoorMock />,
              },
            ].map((s, i) => (
              <div
                key={s.n}
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <div className="relative inline-block">
                    <span className="text-[13px] font-extrabold tracking-widest text-[var(--coral)]">
                      STEP {s.n}
                    </span>
                    <Circled className="absolute -left-5 -top-3 h-14 w-24 text-[var(--coral-faint)]" />
                  </div>
                  <h3 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
                    {s.body}
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className={`lp-tilt-${(i % 3) + 1}`}>{s.art}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ The door ══════════════ */}
      <section id="door" className="border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-6 sm:px-10 lg:px-16 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-soft)]">
              The bit everyone forgets
            </p>
            <h2 className="mt-5 text-[30px] font-extrabold leading-[1.1] tracking-tight sm:text-[40px]">
              A queue is <Mark color="var(--peri)">no place</Mark> to be reading a spreadsheet
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[var(--on-ground-soft)]">
              Selling the ticket is the easy half. The door is where events actually
              go wrong — so that&apos;s the half we built properly.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {[
              { t: "One ticket, one entry", b: "Scan a code twice and it tells you it's already been used, and when. The same screenshot can't walk in three times." },
              { t: "Works on any phone", b: "It's a web page, not an app to install. Anyone on the door opens a link and starts scanning — no training, no hardware to hire." },
              { t: "Camera died? Type it", b: "Every ticket has a short code printed under the QR. Read it out, type it in, carry on. A flat battery doesn't stop the door." },
              { t: "A running count", b: "How many are in, out of how many sold, updating as you scan. You know when the room is full before the room tells you." },
            ].map((f, i) => (
              <div key={f.t} className={`lp-block-dark rounded-2xl bg-[var(--ground-raised)] p-6 lp-tilt-${(i % 4) + 1}`}>
                <h3 className="text-[18px] font-extrabold tracking-tight">{f.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--on-ground-soft)]">{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ The dark band — money honesty ══════════════ */}
      <section id="money" className="relative overflow-hidden border-b border-[var(--hairline)] px-6 py-24 sm:px-10 lg:px-16">
        <Image
          src="/hero-crowd.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_35%]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[#12080F]/82" aria-hidden="true" />
        <Sparkle className="absolute right-[10%] top-[18%] hidden h-5 w-5 text-[#FFDE59]/60 sm:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h2 className="text-[34px] font-extrabold leading-[1.05] tracking-tight text-[var(--paper)] sm:text-[46px]">
              We never{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-[#FFDE59]">
                hold
              </span>{" "}
              your money.
            </h2>

            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[var(--paper-muted)]">
              When someone buys a ticket, the payment splits at that exact moment.
              Your share goes straight to your own bank account — it never sits in
              ours, not even overnight, not even until the event.
            </p>

            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-[var(--paper-muted)]">
              That&apos;s why there&apos;s no wallet here, no balance, and nothing to withdraw.
              There&apos;s nothing to withdraw{" "}
              <em className="font-[family-name:var(--font-instrument-serif)] not-italic">
                because it&apos;s already yours
              </em>
              .
            </p>

            <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border-2 border-[#FFDE59] px-5 py-2.5">
              <span className="h-2 w-2 rounded-full bg-[#FFDE59]" />
              <span className="text-[13px] font-bold text-[#FFDE59]">
                {RATE_LABEL} a ticket. Never more than {CAP_LABEL}.
              </span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="lp-tilt-3">
              <PayoutMock />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ Buyer trust ══════════════ */}
      <section className="border-b border-[var(--hairline)] px-6 sm:px-10 lg:px-16 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[30px] font-extrabold leading-[1.1] tracking-tight sm:text-[40px]">
              Nobody taps a payment link <Mark color="var(--lilac)">without thinking twice</Mark>
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[var(--on-ground-soft)]">
              So every page is built to answer that hesitation before it costs you the sale.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {[
              { t: "No account. No app.", b: "They tap the link and pay. Nothing to sign up for, nothing to download, no password between them and their ticket." },
              { t: "Tickets arrive instantly", b: "The confirmation email lands with a QR code for each person, the moment the payment clears. Nobody has to wonder if it worked." },
              { t: "Your face is on it", b: "Your name, photo and profile sit at the top. People are trusting you, not an unfamiliar logo." },
              { t: "It looks right when shared", b: "Cover art, title, date and price all show up in the preview, before the page even loads." },
            ].map((f, i) => (
              <div key={f.t} className={`lp-block-dark rounded-2xl bg-[var(--ground-raised)] p-6 lp-tilt-${(i % 4) + 1}`}>
                <h3 className="text-[18px] font-extrabold tracking-tight">{f.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--on-ground-soft)]">{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <section id="faq" className="border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-6 sm:px-10 lg:px-16 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-[32px] font-extrabold tracking-tight sm:text-[42px]">
            Fair questions
          </h2>

          <div className="mt-12 space-y-3">
            {[
              { q: "What does it actually cost?", a: `${RATE_LABEL} of each paid ticket, and never more than ${CAP_LABEL} on a single one — so past about ₦75,000 a ticket the fee stops growing while a percentage competitor keeps taking its cut. Tickets under ${FREE_BELOW_LABEL}, and free events, cost nothing at all. No signup fee, no monthly plan. If you sell nothing, you pay nothing.` },
              { q: "What about free events?", a: "Completely free. We don't charge a fee on a ₦0 ticket, so community nights, open days and RSVPs cost you nothing at all — and everyone still gets a real scannable ticket." },
              { q: "How do I get my money?", a: "Straight to your own bank account. The payment splits at the moment someone buys, so your share settles directly to you. We never hold it, which is also why there's nothing to withdraw." },
              { q: "Do my buyers need an account?", a: "No. They tap your link, pick their tickets, enter a name and email, and pay. Their tickets arrive by email seconds later." },
              { q: "Can I sell different kinds of ticket?", a: "Yes. Set up as many types as you like — Early Bird, General, VIP — each with its own price and its own limit. When a tier sells out it closes itself, and the others carry on." },
              { q: "How does check-in work?", a: "Open the door page on any phone and scan the QR on each ticket. It tells you immediately whether to let them in, and won't let the same ticket through twice. If the camera won't play, you can type the code instead." },
              { q: "Do I need a website?", a: "No. Your event page is the website. One shareable link with everything on it." },
            ].map((f, i) => (
              <details key={f.q} className={`lp-block-dark group rounded-2xl bg-[var(--ground-raised)] px-6 py-5 lp-tilt-${(i % 2) + 3}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold">
                  {f.q}
                  <span className="shrink-0 text-[var(--coral)] transition-transform group-open:rotate-45">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                      <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--on-ground-soft)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ Final CTA ══════════════ */}
      <section className="relative overflow-hidden border-b border-[var(--hairline)] bg-gradient-to-br from-[#8B5CF6] via-[#F5568E] to-[#FF6A45] px-6 sm:px-10 lg:px-16 py-24 text-center">
        <Sparkle className="absolute left-[14%] top-[22%] hidden h-6 w-6 text-white/60 sm:block" />
        <Star className="absolute bottom-[22%] right-[16%] hidden h-5 w-5 text-white/40 sm:block" />

        <div className="relative mx-auto max-w-xl">
          <h2 className="text-[36px] font-extrabold leading-[1.02] tracking-tight text-white sm:text-[52px]">
            What are you
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              putting on?
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-sm text-[16px] leading-relaxed text-white/90">
            Set it up now, share your link today, and scan people in at the door
            like you&apos;ve done it a hundred times.
          </p>

          <div className="relative mt-10 inline-block">
            <StartCta />
            <ArrowCurve className="absolute -right-20 -top-8 hidden h-16 w-20 text-white/60 sm:block" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
