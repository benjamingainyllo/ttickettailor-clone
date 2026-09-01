import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Squiggle, Underline } from "@/components/marketing/doodles";
import { FeeCalculator } from "@/components/marketing/fee-calculator";

/**
 * The page a forwarded ticket lands on.
 *
 * WHY /sell AND NOT /pricing/calculator. This URL is printed at the bottom
 * of every ticket we deliver, and tickets get forwarded into group chats.
 * It has to survive being read off a phone screen and retyped, so it is
 * one short word. /pricing is still the full price list; this is the one
 * question a stranger actually has — "what would this cost me?" — with the
 * answer they can work out themselves in ten seconds.
 *
 * Everything numeric on it comes from the live fee engine. See
 * components/marketing/fee-calculator.tsx.
 */
export const metadata: Metadata = {
  title: "What you'd keep",
  description:
    "Work out what selling your tickets on Paylance would cost you, against a platform charging 8% + ₦100. 4% a ticket, capped at ₦3,000, free under ₦2,000, and the money reaches your bank the moment a ticket sells.",
};

const REASONS = [
  {
    title: "Paid the same minute",
    body: "Each payment splits as it happens and your share lands in your own bank account. Not after the event, not in seven days — while the tickets are still selling.",
  },
  {
    title: "The fee stops. Theirs doesn't",
    body: "We take 4% of a ticket and never more than ₦3,000 — so past ₦75,000 a ticket, the fee simply stops growing. A percentage platform keeps taking its cut all the way up: on a ₦500,000 table they take ₦40,100 and we take ₦3,000.",
  },
  {
    title: "Tickets arrive on WhatsApp",
    body: "Where your guests actually read things, with email as the copy that survives a changed phone. They show the QR code at the door from their own screen.",
  },
  {
    title: "We never hold your money",
    body: "There is no wallet here and nothing to withdraw. Your share goes straight from the payment to your bank, so there is no balance of yours for us to sit on.",
  },
];

export default function SellPage() {
  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      {/* ══════════════ The question, and the answer ══════════════ */}
      <section className="border-b border-[var(--hairline)] px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--on-ground-soft)]">
              Run the numbers yourself
            </p>
            <h1 className="mt-4 text-[36px] font-extrabold leading-[1.02] tracking-[-0.04em] text-balance sm:text-[54px]">
              What would you{" "}
              <span className="lp-mark">
                <span>keep?</span>
              </span>
            </h1>
            <div className="mt-4 flex justify-center">
              <Underline className="h-3 w-44 text-[var(--coral)]" />
            </div>
            <p className="mx-auto mt-6 max-w-[46ch] text-[16.5px] leading-relaxed text-[var(--on-ground-soft)]">
              Put in your ticket price and how many you expect to sell. These
              are the real fees &mdash; the same ones the checkout charges, not
              an estimate.
            </p>
          </div>

          <div className="relative mx-auto mt-12 max-w-2xl">
            <Squiggle className="absolute -left-10 -top-8 hidden h-10 w-24 text-[var(--lilac)] lg:block" />
            <FeeCalculator />
          </div>

          <p className="mx-auto mt-6 max-w-[52ch] text-center text-[13px] leading-relaxed text-[var(--on-ground-faint)]">
            The 8% + ₦100 comparison was read straight off the incumbent&rsquo;s
            own checkout in September 2026, across nine ticket types. Card
            processing is charged separately by the bank on either platform.
          </p>
        </div>
      </section>

      {/* ══════════════ Why, beyond the number ══════════════ */}
      <section className="border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="max-w-[20ch] text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[38px]">
            The fee is the smaller half of it
          </h2>
          <p className="mt-5 max-w-[54ch] text-[16.5px] leading-relaxed text-[var(--on-ground-soft)]">
            Anyone can cut a price. These are the parts of how Paylance works
            that don&rsquo;t change when somebody runs a promotion.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {REASONS.map((r, i) => (
              <div
                key={r.title}
                className={`lp-block-dark rounded-2xl bg-[var(--ground-raised)] p-7 lp-tilt-${(i % 3) + 1}`}
              >
                <h3 className="text-[19px] font-extrabold tracking-tight">{r.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ Start ══════════════ */}
      <section className="px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[38px]">
            Put your next event on it
          </h2>
          <p className="mx-auto mt-5 max-w-[44ch] text-[16.5px] leading-relaxed text-[var(--on-ground-soft)]">
            Setting one up takes a few minutes, and costs nothing until a ticket
            actually sells.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <StartCta />
            <Link
              href="/pricing"
              className="text-[14px] font-semibold text-[var(--on-ground-soft)] underline-offset-4 hover:text-[var(--on-ground)] hover:underline"
            >
              See the full price list
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
