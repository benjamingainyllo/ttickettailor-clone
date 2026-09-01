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
export type PlatformFeeType = "percentage" | "flat" | "banded" | "capped";

/**
 * Paylance takes 4% of a ticket, and never more than ₦3,000.
 *
 * WHY THIS SHAPE. The old model was four flat bands, and bands have an
 * unavoidable fault: the fee jumps at every boundary. A ₦29,999 ticket
 * cost the organiser ₦450 and a ₦30,000 one cost ₦1,500 — three times as
 * much for one naira more, which across 200 tickets was ₦210,000 for
 * pricing a night ₦1 higher. It also meant the EFFECTIVE rate sawtoothed
 * between 1.25% and 10% depending where a ticket happened to land, so
 * "a flat fee, never a percentage" was not really true.
 *
 * One rate with a ceiling has neither problem. There is nothing to game,
 * nothing to fall off, and it is one sentence to explain.
 *
 * THE CAP IS THE PRODUCT. 4% on its own is unremarkable. "We stop
 * charging you at ₦3,000" is the part a promoter selling a ₦500,000
 * table repeats to other promoters — the competition takes ₦40,100 on
 * that ticket.
 *
 * FOR REFERENCE, WHAT THE COMPETITION ACTUALLY CHARGES. Tix.Africa takes
 * 8% + ₦100, added on top so the buyer pays it, and charges it once PER
 * SEAT on a group ticket — their "Squad of 4" at ₦56,000 carries ₦4,880
 * in fees. Verified 1 September 2026 by reading nine live ticket types
 * across two events on their own checkout; every one matched 8% + ₦100
 * per seat exactly.
 *
 * Do not "correct" this to 5% again. An earlier version of this comment
 * did, on no evidence, and the wrong figure went out on the pricing page
 * and the calculator for weeks — understating our own advantage by about
 * half. If you change it, check a live checkout first and say so here.
 */
export const DEFAULT_PLATFORM_FEE_TYPE: PlatformFeeType = "capped";
/** Basis points. 400 = 4.00%. Per creator, so a deal can be cut. */
export const DEFAULT_PLATFORM_FEE_VALUE = 400;

/**
 * Never take more than this from a single ticket, however expensive.
 * Bites at ₦75,000 on the default 4%.
 */
export const PLATFORM_FEE_CAP_KOBO: Kobo = 300_000; // ₦3,000

/**
 * Below this, selling is free. Campus nights, church programmes and
 * community events cost us almost nothing to carry and are how a lot of
 * organisers meet the product.
 */
export const PLATFORM_FEE_FREE_BELOW_KOBO: Kobo = 200_000; // ₦2,000

/**
 * The fee for one ticket at this price, under the capped model.
 *
 * Rounded down, so a rounding error can never take more than the stated
 * rate. The cap and the free floor are applied here rather than by each
 * caller, because they are the pricing promise and must hold everywhere.
 */
export function cappedFeeKobo(unitPriceKobo: Kobo, rateBps: number): Kobo {
  assertKobo(unitPriceKobo);
  if (unitPriceKobo < PLATFORM_FEE_FREE_BELOW_KOBO) return 0;
  const fee = Math.floor((unitPriceKobo * Math.round(rateBps)) / 10_000);
  return Math.min(fee, PLATFORM_FEE_CAP_KOBO);
}

/**
 * The superseded band table.
 *
 * Kept because accounts created before the change may still be set to
 * 'banded', and their historical orders have to stay explainable. Nothing
 * new is priced this way — see DEFAULT_PLATFORM_FEE_TYPE above.
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
    feeType === "capped"
      ? cappedFeeKobo(grossKobo, feeValue)
      : feeType === "banded"
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

  // Charged PER TICKET, so the cap is per ticket too. Capping the whole
  // order at ₦3,000 would make a ten-ticket group nearly free, which is
  // not the promise — the promise is that no single ticket costs more
  // than the cap.
  if (feeType === "flat" || feeType === "banded" || feeType === "capped") {
    return calculatePlatformFeeKobo(unitPriceKobo, feeType, feeValue) * quantity;
  }

  return calculatePlatformFeeKobo(unitPriceKobo * quantity, "percentage", feeValue);
}

function assertKobo(kobo: unknown): asserts kobo is Kobo {
  if (!isKobo(kobo)) {
    throw new Error(`Expected an integer kobo amount, received: ${String(kobo)}`);
  }
}
