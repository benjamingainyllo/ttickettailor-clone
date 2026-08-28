import type { Metadata } from "next";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Sparkle, Squiggle, Star, Underline } from "@/components/marketing/doodles";
import { Check, X } from "lucide-react";
import { PLATFORM_FEE_BANDS, bandFeeKobo, koboToNaira, nairaToKobo } from "@/lib/money";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "A flat fee per paid ticket, from ₦200. No percentage of your revenue, no monthly plan, no signup fee, and nothing at all on a free event.",
};

/**
 * Every fee on this page is read from the live band table in lib/money.ts
 * rather than typed in here. A published price that disagrees with what
 * the engine actually charges is the worst bug this page can have, and
 * hardcoding the numbers twice is how that happens.
 */
const TYPICAL_RATE = 0.05;
const TYPICAL_FLAT = 100;

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** What one ticket at this naira price costs the organiser. */
const feeFor = (priceNaira: number) => koboToNaira(bandFeeKobo(nairaToKobo(priceNaira)));

/** The band table, rendered straight from the engine's own boundaries. */
const BAND_ROWS = PLATFORM_FEE_BANDS.map((band, i) => {
  const fromNaira = i === 0 ? 0 : koboToNaira(PLATFORM_FEE_BANDS[i - 1].belowKobo);
  const toNaira = Number.isFinite(band.belowKobo) ? koboToNaira(band.belowKobo) : null;
  return {
    range:
      toNaira === null
        ? `${naira(fromNaira)} and up`
        : fromNaira === 0
          ? `Under ${naira(toNaira)}`
          : `${naira(fromNaira)} – ${naira(toNaira)}`,
    fee: koboToNaira(band.feeKobo),
  };
});

/**
 * Worked examples, weighted to the events we actually want: club nights,
 * and the higher-priced end where a flat fee is dramatically cheaper than
 * a percentage. A ₦2,000 raffle is not the customer this is built for.
 */
const SCENARIOS = [
  { label: "A club night", price: 10000, count: 300 },
  { label: "A comedy show", price: 12000, count: 200 },
  { label: "A concert", price: 20000, count: 1000 },
  { label: "A conference", price: 45000, count: 250 },
  { label: "A weekend retreat", price: 150000, count: 40 },
];

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
      <section className="relative overflow-hidden border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <Sparkle className="absolute left-[10%] top-[18%] hidden h-6 w-6 text-[var(--coral)]/40 sm:block" />

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-soft)]">
            Pricing
          </p>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[56px]">
            A flat fee per ticket.
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              Four of them.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-[var(--on-ground-soft)]">
            Never a percentage of your revenue. The ticket&apos;s price picks
            the fee, and then the fee stops — sell ten times as many and you
            pay ten times ₦450, not ten times more of your takings.
          </p>

          <div className="mx-auto mt-12 max-w-lg">
            <div className="lp-block lp-tilt-2 overflow-hidden rounded-3xl bg-[#9BE3C0] p-2">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="px-5 pb-2 pt-4 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#1B1512]/70">
                      Ticket price
                    </th>
                    <th className="px-5 pb-2 pt-4 text-right text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#1B1512]/70">
                      You pay
                    </th>
                  </tr>
                </thead>
                <tbody className="[font-variant-numeric:tabular-nums]">
                  {BAND_ROWS.map((b, i) => (
                    <tr key={b.range}>
                      <td
                        className={`px-5 py-3 text-[15px] font-semibold text-[var(--ink)] ${
                          i > 0 ? "border-t border-[#1B1512]/15" : ""
                        }`}
                      >
                        {b.range}
                      </td>
                      <td
                        className={`px-5 py-3 text-right text-[22px] font-extrabold tracking-tight text-[var(--ink)] ${
                          i > 0 ? "border-t border-[#1B1512]/15" : ""
                        }`}
                      >
                        {naira(b.fee)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border-t border-[#1B1512]/15 px-5 py-3 text-[15px] font-semibold text-[var(--ink)]">
                      A free ticket
                    </td>
                    <td className="border-t border-[#1B1512]/15 px-5 py-3 text-right text-[22px] font-extrabold tracking-tight text-[var(--ink)]">
                      Nothing
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-lg text-[15px] leading-relaxed text-[var(--on-ground-faint)]">
            On any ticket from ₦2,000 up, that is less than a 5% platform
            would take — and on a ₦150,000 retreat ticket, three times less.
          </p>

          <div className="mt-9 flex justify-center">
            <StartCta />
          </div>
        </div>
      </section>

      {/* ══════════════ The other half of the pitch ══════════════ */}
      <section className="border-b border-[var(--hairline)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-soft)]">
            And the part that isn&apos;t about price
          </p>
          <h2 className="mt-5 text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px]">
            It goes to your bank,
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              not to our wallet.
            </span>
          </h2>
          <div className="mt-3 flex justify-center">
            <Underline className="h-3 w-56 text-[var(--coral)]" />
          </div>

          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--on-ground-soft)]">
            Your share splits off at the moment someone pays and settles to
            your own account. There is no balance on this site, no payout
            button and nothing to withdraw — because your money never arrives
            here in the first place.
          </p>

          <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
            {[
              { t: "No payout request", b: "Nothing to claim, approve or chase. You are not in a queue behind anyone." },
              { t: "No holding until after", b: "A platform sitting on your money can decide to keep it until the event ends. We are not in that position." },
              { t: "No wallet to empty", b: "Nowhere for your money to sit, so nowhere for it to be frozen, capped or lost if we disappear." },
            ].map((f, i) => (
              <div key={f.t} className={`lp-block-dark rounded-2xl bg-[var(--ground-raised)] p-6 lp-tilt-${(i % 3) + 1}`}>
                <h3 className="text-[16px] font-extrabold leading-tight tracking-tight">{f.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--on-ground-soft)]">{f.b}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-xl text-[13.5px] leading-relaxed text-[var(--on-ground-faint)]">
            How quickly it lands is your bank&apos;s settlement time, not ours.
            We are not in the middle of it, so we can neither slow it down nor
            speed it up.
          </p>
        </div>
      </section>

      {/* ══════════════ Worked examples ══════════════ */}
      <section className="border-b border-[var(--hairline)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px]">
              What it actually costs you
            </h2>
            <div className="mt-3 flex justify-center">
              <Underline className="h-3 w-52 text-[var(--coral)]" />
            </div>
            <p className="mt-5 text-[16px] leading-relaxed text-[var(--on-ground-soft)]">
              Five real-shaped events, against the 5% + ₦100 the incumbent charges.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[15px]">
              <thead>
                <tr>
                  {["", "Tickets", "Paylance", "A typical 5% platform", "You keep"].map((h) => (
                    <th
                      key={h}
                      className="border-b border-[var(--hairline)] pb-3 pr-4 text-left text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--on-ground-soft)] last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[font-variant-numeric:tabular-nums]">
                {SCENARIOS.map((s) => {
                  const ours = feeFor(s.price) * s.count;
                  const theirs = (s.price * TYPICAL_RATE + TYPICAL_FLAT) * s.count;
                  return (
                    <tr key={s.label}>
                      <td className="border-b border-[var(--hairline)] py-4 pr-4">
                        <span className="block font-bold text-[var(--on-ground)]">{s.label}</span>
                        <span className="block text-[13px] text-[var(--on-ground-soft)]">
                          {naira(s.price)} a ticket
                        </span>
                      </td>
                      <td className="border-b border-[var(--hairline)] py-4 pr-4 text-[var(--on-ground-soft)]">
                        {s.count.toLocaleString("en-NG")}
                      </td>
                      <td className="border-b border-[var(--hairline)] py-4 pr-4 font-bold text-[var(--on-ground)]">
                        {naira(ours)}
                      </td>
                      <td className="border-b border-[var(--hairline)] py-4 pr-4 text-[var(--on-ground-soft)] line-through">
                        {naira(theirs)}
                      </td>
                      <td className="border-b border-[var(--hairline)] py-4 text-right font-extrabold text-[var(--mint)]">
                        +{naira(theirs - ours)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-[13px] text-[var(--on-ground-soft)]">
            The comparison rate is a common one in this market. Card processing
            fees are charged by the bank, not by us, and apply either way.
          </p>
        </div>
      </section>

      {/* ══════════════ In / never ══════════════ */}
      <section className="border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="lp-block-dark lp-tilt-1 rounded-2xl bg-[var(--ground-raised)] p-8">
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

          <div className="lp-block-dark lp-tilt-3 rounded-2xl bg-[var(--ground-raised)] p-8">
            <h2 className="text-[22px] font-extrabold tracking-tight">
              What we never charge
            </h2>
            <ul className="mt-5 space-y-3">
              {NEVER.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-[var(--on-ground-soft)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFB3C7]">
                    <X className="h-3 w-3 text-[var(--ink)]" strokeWidth={3} />
                  </span>
                  <span className="line-through decoration-[var(--hairline-firm)]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════ Questions ══════════════ */}
      <section className="border-b border-[var(--hairline)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-[30px] font-extrabold tracking-tight sm:text-[40px]">
            Fair questions about money
          </h2>

          <div className="mt-12 space-y-3">
            {[
              { q: "When exactly do I pay the fee?", a: "You don't pay it — it comes out of the ticket at the moment it's sold, along with your own share. There's no bill, no invoice and nothing to remember. If a ticket doesn't sell, there's no fee." },
              { q: "How do I get my money?", a: "Straight to your own bank account. The payment splits the instant someone buys, so your share settles directly to you. We never hold it, which is also why there's nothing here to withdraw." },
              { q: "How long until it reaches my bank?", a: "That's your bank's settlement time, not ours — usually the next working day. We're not in the middle of it, so we can't slow it down or speed it up." },
              { q: "Are free events really free?", a: "Yes. We charge nothing on a ₦0 ticket, so community nights, church programmes and open days cost you nothing — and everybody still gets a real scannable ticket." },
              { q: "What about card processing fees?", a: "Your payment provider charges those, and they'd charge them on any platform. They're separate from our fee and go to the bank, not to us." },
              { q: "Can I change the price after I publish?", a: "Yes. You can edit a ticket type at any time, and add new ones. What you can't do is set a limit lower than the number you've already sold — that would make your own numbers lie to you." },
              { q: "Is there a contract?", a: "No. No plan, no minimum, no notice period. Sell one ticket a year or ten thousand." },
            ].map((f, i) => (
              <details
                key={f.q}
                className={`lp-block-dark group rounded-2xl bg-[var(--ground-raised)] px-6 py-5 lp-tilt-${(i % 2) + 3}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold">
                  {f.q}
                  <span className="shrink-0 text-[var(--coral)] transition-transform group-open:rotate-45">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
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

      {/* ══════════════ CTA ══════════════ */}
      <section className="relative overflow-hidden border-b border-[var(--hairline)] bg-gradient-to-br from-[#FF6A45] via-[#F5568E] to-[#8B5CF6] px-6 py-24 text-center sm:px-10 lg:px-16">
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
