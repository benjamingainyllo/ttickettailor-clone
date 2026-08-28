/**
 * Money in Paylance is ALWAYS an integer number of kobo.
 *
 * Never store or compute money as naira, as a float, or as `numeric`.
 * Every conversion and every bit of formatting goes through this file —
 * no ad-hoc `* 100` or `/ 100` anywhere else in the codebase.
 */

/** An integer number of kobo. 100 kobo = ₦1. */
export type Kobo = number;

const KOBO_PER_NAIRA = 100;

export function isKobo(value: unknown): value is Kobo {
  return typeof value === "number" && Number.isSafeInteger(value);
}

/** Convert a naira amount (from user input or an external API) into kobo. */
export function nairaToKobo(naira: number): Kobo {
  if (!Number.isFinite(naira)) {
    throw new Error(`Cannot convert non-finite naira value: ${naira}`);
  }
  // Round rather than truncate so 19.99 * 100 floating point noise
  // (1998.9999...) doesn't silently lose a kobo.
  return Math.round(naira * KOBO_PER_NAIRA);
}

/** Convert kobo to naira. For DISPLAY and for provider APIs only — never for storage. */
export function koboToNaira(kobo: Kobo): number {
  assertKobo(kobo);
  return kobo / KOBO_PER_NAIRA;
}

/**
 * Parse a free-text naira input ("5,000", "₦5000", "5000.50") into kobo.
 * Returns null when the input isn't a usable amount, so callers can show a
 * validation message instead of silently charging the wrong thing.
 */
export function parseNairaInput(input: string): Kobo | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (cleaned === "" || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const naira = Number(cleaned);
  if (!Number.isFinite(naira) || naira < 0) return null;
  return nairaToKobo(naira);
}

/** Format kobo for display: 500000 -> "₦5,000". Whole naira unless kobo remain. */
export function formatKobo(kobo: Kobo): string {
  assertKobo(kobo);
  const naira = kobo / KOBO_PER_NAIRA;
  const hasFraction = kobo % KOBO_PER_NAIRA !== 0;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Fee model, configured per creator so it can change without a migration. */
export type PlatformFeeType = "percentage" | "flat" | "banded";

/**
 * Paylance charges a FLAT FEE PER TICKET, and no percentage of revenue.
 *
 * That is the whole pricing position: a creator selling a ₦50,000 ticket
 * pays the same as one selling a ₦2,000 ticket, and a creator who sells
 * nothing pays nothing. A percentage model is still supported below
 * because the fee is configured per creator, but it is no longer what a
 * new account gets.
 *
 * ₦200 per paid ticket. For reference, Tix.Africa's free plan charges
 * 5% + ₦100 — on a ₦20,000 ticket that is ₦1,100 against our ₦200.
 * (An earlier version of this comment said 8% + ₦100, which was wrong.
 * Rechecked August 2026; see BUSINESS_MODEL.md before quoting it.)
 */
export const DEFAULT_PLATFORM_FEE_TYPE: PlatformFeeType = "banded";
export const DEFAULT_PLATFORM_FEE_VALUE = 20_000;

/**
 * The four bands. A flat fee per ticket — there are simply four of them,
 * chosen by the ticket's own price. "A flat fee, never a percentage of
 * your revenue" stays literally true: sell twice as many tickets and you
 * pay twice the fee; charge twice as much and you do not.
 *
 * WHY THE BOUNDARIES SIT WHERE THEY DO. Each band's fee has to be lower
 * than what Tix's free plan (5% + ₦100) would take at the CHEAPEST ticket
 * in that band, or the band opens with us as the expensive option. That
 * puts a hard floor under each boundary:
 *
 *     ₦450   beats 5% + ₦100 above ₦7,000
 *     ₦1,500 beats it above ₦28,000
 *     ₦2,500 beats it above ₦48,000
 *
 * Below ₦2,000 no flat fee can win, because a percentage competitor's base
 * charge is only ₦100 and any fee worth collecting is more than that. So we
 * do not compete there: tickets under ₦2,000 are free to sell. It costs
 * almost nothing (those events were never going to pay for themselves) and
 * it turns the one price we lose at into the one price we give away.
 *
 * The boundaries below are rounded up from those break-even points, not
 * picked for looking tidy. Move a boundary DOWN and the band starts in a
 * stretch where a percentage competitor is cheaper than we are, which is
 * the one claim the whole product is built on. Check the arithmetic
 * before touching these numbers.
 */
export const PLATFORM_FEE_BANDS: ReadonlyArray<{
  /** Applies while the unit price is BELOW this, in kobo. */
  readonly belowKobo: number;
  readonly feeKobo: Kobo;
}> = [
  { belowKobo: 200_000, feeKobo: 0 },           // under ₦2,000  -> free
  { belowKobo: 750_000, feeKobo: 20_000 },      // ₦2,000-₦7,500 -> ₦200
  { belowKobo: 3_000_000, feeKobo: 45_000 },    // ₦7,500-₦30,000 -> ₦450
  { belowKobo: 7_500_000, feeKobo: 150_000 },   // ₦30,000-₦75,000 -> ₦1,500
  { belowKobo: Infinity, feeKobo: 250_000 },    // ₦75,000+      -> ₦2,500
];

/** The band fee for one ticket at this price, in kobo. */
export function bandFeeKobo(unitPriceKobo: Kobo): Kobo {
  assertKobo(unitPriceKobo);
  for (const band of PLATFORM_FEE_BANDS) {
    if (unitPriceKobo < band.belowKobo) return band.feeKobo;
  }
  // Unreachable while the last band is Infinity, but a table edited badly
  // should charge the top rate rather than nothing at all.
  return PLATFORM_FEE_BANDS[PLATFORM_FEE_BANDS.length - 1].feeKobo;
}

/**
 * The platform's cut of a single unit, in kobo.
 *
 *  - "percentage": `value` is BASIS POINTS (900 = 9.00%)
 *  - "flat":       `value` is kobo per unit
 *
 * Always rounds down so we never take more than the configured rate.
 */
export function calculatePlatformFeeKobo(
  grossKobo: Kobo,
  feeType: PlatformFeeType,
  feeValue: number
): Kobo {
  assertKobo(grossKobo);

  // Free is free. We never take a fee on a ticket nobody paid for —
  // a flat fee would otherwise turn a ₦0 RSVP into a charge.
  if (grossKobo === 0) return 0;

  const fee =
    feeType === "banded"
      ? bandFeeKobo(grossKobo)
      : feeType === "flat"
        ? Math.round(feeValue)
        : Math.floor((grossKobo * Math.round(feeValue)) / 10_000);

  // Never take more than the buyer paid.
  return Math.max(0, Math.min(fee, grossKobo));
}

/**
 * The platform's cut of a whole order.
 *
 * This is the one to call at checkout. A flat fee is charged PER TICKET,
 * so it has to see the quantity — computing it from the order total
 * instead would quietly charge one fee for a four-ticket purchase.
 */
export function calculateOrderPlatformFeeKobo(
  unitPriceKobo: Kobo,
  quantity: number,
  feeType: PlatformFeeType,
  feeValue: number
): Kobo {
  assertKobo(unitPriceKobo);

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error(`Expected a positive integer quantity, received: ${String(quantity)}`);
  }

  if (feeType === "flat" || feeType === "banded") {
    return calculatePlatformFeeKobo(unitPriceKobo, feeType, feeValue) * quantity;
  }

  return calculatePlatformFeeKobo(unitPriceKobo * quantity, "percentage", feeValue);
}

function assertKobo(kobo: unknown): asserts kobo is Kobo {
  if (!isKobo(kobo)) {
    throw new Error(`Expected an integer kobo amount, received: ${String(kobo)}`);
  }
}
