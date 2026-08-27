import type { Metadata } from "next";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Circled, Sparkle, Squiggle, Star, Underline } from "@/components/marketing/doodles";
import { DoorMock, LinkMock, TicketMock, TiersMock } from "@/components/marketing/mockups";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Ticket types with their own prices and limits, QR tickets by email, a check-in scanner that works on any phone, and money that settles straight to your own bank.",
};

/**
 * Only things the product actually does today.
 *
 * Tempting to pad this out with what competitors list — seating charts,
 * waitlists, recurring events — but a feature page that promises what
 * isn't built costs more in refunds and trust than it wins in signups.
 */
const CAPABILITIES = [
  {
    label: "Selling",
    title: "Ticket types that do the thinking",
    body: "Early Bird at one price, General at another, VIP at a third. Give each one its own allocation and it closes itself when it sells out, while the others carry on. Set how many a single person can buy so one bot can't take the room.",
    art: <TiersMock />,
    points: [
      "As many ticket types as you like",
      "Per-type limits, or leave it unlimited",
      "A cap on how many per order",
      "Sold-out types close themselves",
    ],
  },
  {
    label: "Sharing",
    title: "One link, and no account for buyers",
    body: "Your event gets a page you can put in a bio, a status or a group chat. Buyers pick a type, choose how many, enter a name and email, and pay. No signup, no app, no password between them and the ticket.",
    art: <LinkMock />,
    points: [
      "Works in any browser",
      "Card or bank transfer",
      "Cover art, date and price in the link preview",
      "Drafts stay private until you publish",
    ],
  },
  {
    label: "Delivering",
    title: "A real ticket, seconds after paying",
    body: "Every admission gets its own row in the database with its own unique code and QR. Buy four and you get four separate tickets, so one person can't walk four people in on one screenshot.",
    art: <TicketMock />,
    points: [
      "One QR per person, not per order",
      "Emailed the moment payment clears",
      "A short code under the QR as backup",
      "Works from the phone, nothing to print",
    ],
  },
  {
    label: "The door",
    title: "Scan them in, on any phone",
    body: "Open the door page and point the camera. Green means let them in. Scan a code twice and it tells you it's already been used, and when. It's a web page, so anyone on the door opens a link and starts working — no app, no hardware to hire.",
    art: <DoorMock />,
    points: [
      "One ticket, one entry — enforced",
      "A running count of who's in",
      "Type the code if the camera won't play",
      "Undo, for the inevitable mis-scan",
    ],
  },
];

const SMALLER = [
  { t: "Free events, properly free", b: "No fee on a ₦0 ticket. Collect RSVPs, still issue real scannable tickets, still get a headcount." },
  { t: "Your money, your bank", b: "Payments split at the moment of sale and your share settles directly to you. We never hold it — which is why there's no wallet here and nothing to withdraw." },
  { t: "Nobody oversells", b: "When two people go for the last ticket at the same moment, exactly one gets it. Decided in a single database operation, not by whoever's internet is faster." },
  { t: "A publish gate", b: "You can't put a paid event on sale until your bank account is connected. Blocked in three separate places, so it can't happen by accident." },
  { t: "Your buyer list", b: "Everyone who ever bought from you, in one place, exportable as a spreadsheet. Yours to take anywhere." },
  { t: "Revenue you can trust", b: "Every figure is worked out from actual paid orders, never from a number stored on the side that could drift out of step." },
];

export default function FeaturesPage() {
  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      {/* ══════════════ Header ══════════════ */}
      <section className="relative overflow-hidden border-b-2 border-[var(--ink)] bg-[var(--paper-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <Sparkle className="absolute left-[9%] top-[20%] hidden h-6 w-6 text-[var(--coral)]/40 sm:block" />

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            Features
          </p>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[56px]">
            Everything between
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              posting the link
            </span>
            <br />
            and the last person in.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-[var(--ink-soft)]">
            Most platforms are good at taking the money and vague about the
            door. Both halves are here, and the door half is the one we
            spent the longest on.
          </p>
          <div className="mt-9 flex justify-center">
            <StartCta />
          </div>
        </div>
      </section>

      {/* ══════════════ The four big ones ══════════════ */}
      <section className="border-b-2 border-[var(--ink)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl space-y-20">
          {CAPABILITIES.map((cap, i) => (
            <div
              key={cap.title}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <div className="relative inline-block">
                  <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[var(--coral)]">
                    {cap.label}
                  </span>
                  <Circled className="absolute -left-5 -top-3 h-14 w-28 text-[var(--coral-faint)]" />
                </div>

                <h2 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
                  {cap.title}
                </h2>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[var(--ink-soft)]">
                  {cap.body}
                </p>

                <ul className="mt-5 space-y-2">
                  {cap.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[14.5px]">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--coral)]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-center">
                <div className={`lp-tilt-${(i % 3) + 1}`}>{cap.art}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ The rest ══════════════ */}
      <section className="border-b-2 border-[var(--ink)] bg-[var(--paper-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px]">
              And the quieter things
            </h2>
            <div className="mt-3 flex justify-center">
              <Underline className="h-3 w-48 text-[var(--coral)]" />
            </div>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SMALLER.map((f, i) => (
              <div key={f.t} className={`lp-block rounded-2xl bg-white p-6 lp-tilt-${(i % 4) + 1}`}>
                <h3 className="text-[17px] font-extrabold leading-tight tracking-tight">{f.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ Honest about what's next ══════════════ */}
      <section className="border-b-2 border-[var(--ink)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            Being straight with you
          </p>
          <h2 className="mt-5 text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-[36px]">
            What isn&apos;t built yet
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-[var(--ink-soft)]">
            Discount codes, waitlists, repeating events, seating charts and
            selling from your own website are all on the list and none of them
            exist today. We&apos;d rather you knew that now than found out the
            week of your event.
          </p>
          <div className="mt-8 flex justify-center">
            <Squiggle className="h-4 w-28 text-[var(--coral)]" />
          </div>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section className="relative overflow-hidden border-b-2 border-[var(--ink)] bg-gradient-to-br from-[#8B5CF6] via-[#F5568E] to-[#FF6A45] px-6 py-24 text-center sm:px-10 lg:px-16">
        <Star className="absolute bottom-[24%] left-[18%] hidden h-5 w-5 text-white/40 sm:block" />
        <div className="relative mx-auto max-w-xl">
          <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-tight text-white sm:text-[48px]">
            Put your first
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              event up tonight.
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
