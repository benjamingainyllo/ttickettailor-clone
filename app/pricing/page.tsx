import type { Metadata } from "next";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Sparkle, Squiggle, Star, Underline } from "@/components/marketing/doodles";
import { Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "₦200 per paid ticket. No percentage of your revenue, no monthly plan, no signup fee, and nothing at all on a free event.",
};

/** The worked example. One place, so every figure on the page agrees. */
const PAYLANCE_PER_TICKET = 200;
const TYPICAL_RATE = 0.05;
const TYPICAL_FLAT = 100;

const SCENARIOS = [
  { label: "A small workshop", price: 5000, count: 30 },
  { label: "A club night", price: 10000, count: 300 },
  { label: "A concert", price: 20000, count: 1000 },
  { label: "A weekend retreat", price: 150000, count: 40 },
];

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

const INCLUDED = [
  "Unlimited events",
  "Unlimited ticket types",
  "QR tickets, issued instantly",
  "Check-in scanner on any phone",
  "Your own event pages",
  "Attendee list, exportable",
  "Card and bank transfer",
  "Money straight to your bank",
];

const NEVER = [
  "A percentage of your revenue",
  "A monthly plan",
  "A signup fee",
  "A fee on free tickets",
  "A charge for extra events",
  "A withdrawal fee",
];

export default function PricingPage() {
  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      {/* ══════════════ The number ══════════════ */}
      <section className="relative overflow-hidden border-b-2 border-[var(--ink)] bg-[var(--paper-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <Sparkle className="absolute left-[10%] top-[18%] hidden h-6 w-6 text-[var(--coral)]/40 sm:block" />

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            Pricing
          </p>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[56px]">
            One number.
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              That&apos;s the whole page.
            </span>
          </h1>

          <div className="mx-auto mt-12 max-w-sm">
            <div className="lp-block lp-tilt-2 rounded-3xl bg-[#9BE3C0] p-10">
              <p className="text-[64px] font-extrabold leading-none tracking-tight text-[var(--ink)] sm:text-[76px]">
                ₦200
              </p>
              <p className="mt-3 text-[15px] font-bold text-[var(--ink)]">
                per paid ticket sold
              </p>
              <p className="mt-1 text-[13.5px] text-[var(--ink)]/70">
                Free tickets cost nothing at all
              </p>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-lg text-[17px] leading-relaxed text-[var(--ink-soft)]">
            Not a percentage. Not a monthly plan. A ₦150,000 retreat ticket costs
            you the same ₦200 as a ₦2,000 comedy night — and if you sell nothing,
            you pay nothing.
          </p>

          <div className="mt-9 flex justify-center">
            <StartCta />
          </div>
        </div>
      </section>

      {/* ══════════════ Worked examples ══════════════ */}
      <section className="border-b-2 border-[var(--ink)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px]">
              What it actually costs you
            </h2>
            <div className="mt-3 flex justify-center">
              <Underline className="h-3 w-52 text-[var(--coral)]" />
            </div>
            <p className="mt-5 text-[16px] leading-relaxed text-[var(--ink-soft)]">
              Four real-shaped events, against the 5% + ₦100 the incumbent charges.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[15px]">
              <thead>
                <tr>
                  {["", "Tickets", "Paylance", "A typical 5% platform", "You keep"].map((h) => (
                    <th
                      key={h}
                      className="border-b-2 border-[var(--ink)] pb-3 pr-4 text-left text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)] last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[font-variant-numeric:tabular-nums]">
                {SCENARIOS.map((s) => {
                  const ours = PAYLANCE_PER_TICKET * s.count;
                  const theirs = (s.price * TYPICAL_RATE + TYPICAL_FLAT) * s.count;
                  return (
                    <tr key={s.label}>
                      <td className="border-b border-[var(--rule)] py-4 pr-4">
                        <span className="block font-bold text-[var(--ink)]">{s.label}</span>
                        <span className="block text-[13px] text-[var(--ink-soft)]">
                          {naira(s.price)} a ticket
                        </span>
                      </td>
                      <td className="border-b border-[var(--rule)] py-4 pr-4 text-[var(--ink-soft)]">
                        {s.count.toLocaleString("en-NG")}
                      </td>
                      <td className="border-b border-[var(--rule)] py-4 pr-4 font-bold text-[var(--ink)]">
                        {naira(ours)}
                      </td>
                      <td className="border-b border-[var(--rule)] py-4 pr-4 text-[var(--ink-soft)] line-through">
                        {naira(theirs)}
                      </td>
                      <td className="border-b border-[var(--rule)] py-4 text-right font-extrabold text-[#1F7A52]">
                        +{naira(theirs - ours)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-[13px] text-[var(--ink-soft)]">
            The comparison rate is a common one in this market. Card processing
            fees are charged by the bank, not by us, and apply either way.
          </p>
        </div>
      </section>

      {/* ══════════════ In / never ══════════════ */}
      <section className="border-b-2 border-[var(--ink)] bg-[var(--paper-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="lp-block lp-tilt-1 rounded-2xl bg-white p-8">
            <h2 className="text-[22px] font-extrabold tracking-tight">
              Included, always
            </h2>
            <ul className="mt-5 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9BE3C0]">
                    <Check className="h-3 w-3 text-[var(--ink)]" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-block lp-tilt-3 rounded-2xl bg-white p-8">
            <h2 className="text-[22px] font-extrabold tracking-tight">
              What we never charge
            </h2>
            <ul className="mt-5 space-y-3">
              {NEVER.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-[var(--ink-soft)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFB3C7]">
                    <X className="h-3 w-3 text-[var(--ink)]" strokeWidth={3} />
                  </span>
                  <span className="line-through decoration-[var(--rule-firm)]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════ Questions ══════════════ */}
      <section className="border-b-2 border-[var(--ink)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-[30px] font-extrabold tracking-tight sm:text-[40px]">
            Fair questions about money
          </h2>

          <div className="mt-12 space-y-3">
            {[
              { q: "When exactly do I pay the ₦200?", a: "You don't pay it — it comes out of the ticket at the moment it's sold, along with your own share. There's no bill, no invoice and nothing to remember. If a ticket doesn't sell, there's no fee." },
              { q: "How do I get my money?", a: "Straight to your own bank account. The payment splits the instant someone buys, so your share settles directly to you. We never hold it, which is also why there's nothing here to withdraw." },
              { q: "How long until it reaches my bank?", a: "That's your bank's settlement time, not ours — usually the next working day. We're not in the middle of it, so we can't slow it down or speed it up." },
              { q: "Are free events really free?", a: "Yes. We charge nothing on a ₦0 ticket, so community nights, church programmes and open days cost you nothing — and everybody still gets a real scannable ticket." },
              { q: "What about card processing fees?", a: "Your payment provider charges those, and they'd charge them on any platform. They're separate from our ₦200 and go to the bank, not to us." },
              { q: "Can I change the price after I publish?", a: "Yes. You can edit a ticket type at any time, and add new ones. What you can't do is set a limit lower than the number you've already sold — that would make your own numbers lie to you." },
              { q: "Is there a contract?", a: "No. No plan, no minimum, no notice period. Sell one ticket a year or ten thousand." },
            ].map((f, i) => (
              <details
                key={f.q}
                className={`lp-block-soft group rounded-2xl bg-white px-6 py-5 lp-tilt-${(i % 2) + 3}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold">
                  {f.q}
                  <span className="shrink-0 text-[var(--coral)] transition-transform group-open:rotate-45">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink-soft)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section className="relative overflow-hidden border-b-2 border-[var(--ink)] bg-gradient-to-br from-[#FF6A45] via-[#F5568E] to-[#8B5CF6] px-6 py-24 text-center sm:px-10 lg:px-16">
        <Star className="absolute left-[16%] top-[24%] hidden h-5 w-5 text-white/40 sm:block" />
        <div className="relative mx-auto max-w-xl">
          <h2 className="text-[34px] font-extrabold leading-[1.02] tracking-tight text-white sm:text-[48px]">
            Nothing to pay
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              until you sell.
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
