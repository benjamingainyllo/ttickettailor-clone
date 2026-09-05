"use client";

import { useMemo, useState } from "react";
import { TYPICAL_RATE, TYPICAL_FLAT_NAIRA } from "@/lib/competitor";
import {
  DEFAULT_PLATFORM_FEE_TYPE,
  DEFAULT_PLATFORM_FEE_VALUE,
  PLATFORM_FEE_FREE_BELOW_KOBO,
  calculateOrderPlatformFeeKobo,
  formatKobo,
  parseNairaInput,
  type Kobo,
} from "@/lib/money";

/**
 * The savings calculator.
 *
 * EVERY FEE HERE COMES OUT OF THE REAL ENGINE. It calls the same
 * calculateOrderPlatformFeeKobo() that checkout calls, with the same rate
 * a new account gets, so the number on this page is the number an
 * organiser will actually be charged — cap and free floor included.
 * Retyping the rate here to save an import is how a marketing page ends
 * up quoting a price the product doesn't honour.
 */

/**
 * The comparison: the free plan most Nigerian organisers are already on.
 *
 * 8% + ₦100, verified 1 September 2026 against nine live ticket types on
 * Tix's own checkout. This page said 5% for weeks on no evidence, which
 * understated our own advantage by roughly half — check a live checkout
 * before changing it.
 */
/* The rate itself lives in lib/competitor.ts so this page, the home page
   and /pricing cannot drift apart again — they already had, at 5% and 8%
   simultaneously. Kobo here because everything on this screen is kobo. */
const TYPICAL_FLAT_KOBO = TYPICAL_FLAT_NAIRA * 100;

/** Quantity is a person's estimate, not a fact — keep it in sane territory. */
const MAX_QUANTITY = 100_000;

/**
 * Where free selling stops, read off the engine rather than typed in.
 * Move it in lib/money.ts and this sentence follows.
 */
const FREE_BELOW_KOBO = PLATFORM_FEE_FREE_BELOW_KOBO;

const PRESETS = [2000, 5000, 10000, 20000, 50000];

function typicalFeeKobo(unitPriceKobo: Kobo, quantity: number): Kobo {
  // A percentage platform charges nothing on a free ticket either, so the
  // honest comparison at ₦0 is ₦0 — not ₦100 a head. Overstating here
  // would be the one thing that discredits the whole page.
  if (unitPriceKobo === 0) return 0;
  const perTicket = Math.floor(unitPriceKobo * TYPICAL_RATE) + TYPICAL_FLAT_KOBO;
  return perTicket * quantity;
}

export function FeeCalculator() {
  const [priceInput, setPriceInput] = useState("20,000");
  const [countInput, setCountInput] = useState("200");

  const { unitPriceKobo, quantity, ours, theirs, saving, isFree, valid } = useMemo(() => {
    const parsedPrice = parseNairaInput(priceInput);
    const parsedCount = Number.parseInt(countInput.replace(/[,\s]/g, ""), 10);

    const okPrice = parsedPrice !== null;
    const okCount =
      Number.isSafeInteger(parsedCount) && parsedCount >= 1 && parsedCount <= MAX_QUANTITY;

    if (!okPrice || !okCount) {
      return {
        unitPriceKobo: 0,
        quantity: 0,
        ours: 0,
        theirs: 0,
        saving: 0,
        isFree: false,
        valid: false,
      };
    }

    const oursKobo = calculateOrderPlatformFeeKobo(
      parsedPrice,
      parsedCount,
      DEFAULT_PLATFORM_FEE_TYPE,
      DEFAULT_PLATFORM_FEE_VALUE
    );
    const theirsKobo = typicalFeeKobo(parsedPrice, parsedCount);

    return {
      unitPriceKobo: parsedPrice,
      quantity: parsedCount,
      ours: oursKobo,
      theirs: theirsKobo,
      saving: Math.max(0, theirsKobo - oursKobo),
      isFree: oursKobo === 0,
      valid: true,
    };
  }, [priceInput, countInput]);

  const field =
    "w-full rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-3.5 text-[20px] font-extrabold text-[var(--ink)] outline-none [font-variant-numeric:tabular-nums] focus-visible:ring-4 focus-visible:ring-[var(--coral-faint)]";
  const legend =
    "mb-2 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--on-ground-soft)]";

  return (
    <div className="lp-block-dark rounded-3xl bg-[var(--ground-raised)] p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={legend} htmlFor="calc-price">
            Your ticket price
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-extrabold text-[var(--ink-soft)]"
            >
              ₦
            </span>
            <input
              id="calc-price"
              inputMode="numeric"
              autoComplete="off"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className={`${field} pl-9`}
            />
          </div>
        </div>

        <div>
          <label className={legend} htmlFor="calc-count">
            How many you&rsquo;ll sell
          </label>
          <input
            id="calc-count"
            inputMode="numeric"
            autoComplete="off"
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            className={field}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--on-ground-faint)]">
          Try
        </span>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriceInput(p.toLocaleString("en-NG"))}
            className="rounded-full border border-[var(--hairline-firm)] px-3 py-1.5 text-[13px] font-semibold text-[var(--on-ground-soft)] transition-colors hover:border-[var(--on-ground)] hover:text-[var(--on-ground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)]"
          >
            ₦{p.toLocaleString("en-NG")}
          </button>
        ))}
      </div>

      {/* The answer. Announced politely so a screen reader hears it change. */}
      <div aria-live="polite" className="mt-8">
        {!valid ? (
          <p className="text-[15px] text-[var(--on-ground-soft)]">
            Enter a ticket price and how many you expect to sell — up to{" "}
            {MAX_QUANTITY.toLocaleString("en-NG")}.
          </p>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-ground-faint)]">
              {saving > 0 ? "You keep" : "The difference"}
            </p>
            <p className="mt-2 text-[clamp(44px,11vw,76px)] font-extrabold leading-[0.95] tracking-[-0.045em] text-[var(--mint)] [font-variant-numeric:tabular-nums]">
              {saving > 0 ? `+${formatKobo(saving)}` : formatKobo(0)}
            </p>
            <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
              {isFree && unitPriceKobo > 0 ? (
                <>
                  Tickets under {formatKobo(FREE_BELOW_KOBO)} are free to sell on
                  Paylance. Not discounted &mdash; free. You&rsquo;d pay{" "}
                  <strong className="font-bold text-[var(--on-ground)]">
                    nothing at all
                  </strong>{" "}
                  on this event.
                </>
              ) : unitPriceKobo === 0 ? (
                <>
                  A free event costs nothing on Paylance. It also costs nothing
                  on most platforms &mdash; so there&rsquo;s no saving to claim
                  here, and we won&rsquo;t invent one. Put in a paid ticket
                  price to see the difference.
                </>
              ) : (
                <>
                  That&rsquo;s what stays with you on{" "}
                  {quantity.toLocaleString("en-NG")} tickets at{" "}
                  {formatKobo(unitPriceKobo)}, against a platform charging 8% +
                  ₦100.
                </>
              )}
            </p>
          </>
        )}
      </div>

      {valid && unitPriceKobo > 0 && (
        <dl className="mt-8 border-t border-[var(--hairline)] pt-6 text-[15px] [font-variant-numeric:tabular-nums]">
          <div className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-[var(--on-ground-soft)]">
              Paylance
              <span className="ml-2 text-[13px] text-[var(--on-ground-faint)]">
                {formatKobo(Math.round(ours / quantity))} a ticket
              </span>
            </dt>
            <dd className="font-extrabold text-[var(--on-ground)]">{formatKobo(ours)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-[var(--on-ground-soft)]">
              An 8% + ₦100 platform
              <span className="ml-2 text-[13px] text-[var(--on-ground-faint)]">
                {formatKobo(Math.floor(unitPriceKobo * TYPICAL_RATE) + TYPICAL_FLAT_KOBO)} a
                ticket
              </span>
            </dt>
            <dd className="text-[var(--on-ground-soft)] line-through">{formatKobo(theirs)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
