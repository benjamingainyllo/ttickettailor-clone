/**
 * What the incumbent actually charges.
 *
 * ONE FILE, BECAUSE IT WAS WRONG IN THREE PLACES. The home page compared
 * us against 5%, the pricing page against 8%, and the calculator against
 * whichever it had been edited to last. A comparison that disagrees with
 * itself across a website is worse than no comparison: the first person
 * to open two tabs stops believing any of it.
 *
 * Tix.Africa takes 8% + ₦100, added ON TOP so the buyer pays it, charged
 * once PER SEAT on a group ticket — their "Squad of 4" at ₦56,000 carries
 * ₦4,880 in fees.
 *
 * Verified 1 September 2026 by reading nine live ticket types across two
 * events on their own checkout; every one matched exactly.
 *
 * DO NOT "CORRECT" THIS TO 5%. An earlier version said 5% on no evidence
 * and the wrong figure went out on the pricing page and the calculator
 * for weeks, understating our own advantage by about half. If you change
 * it, read a live checkout first and update the date below.
 */

export const TYPICAL_RATE = 0.08;
export const TYPICAL_FLAT_NAIRA = 100;
export const TYPICAL_CHECKED = "September 2026";

/** How the rate reads in a sentence: "8% + ₦100". */
export const TYPICAL_LABEL = `${TYPICAL_RATE * 100}% + ₦${TYPICAL_FLAT_NAIRA}`;

/** "An 8% platform", not "a 8% platform" — read aloud, not spelled. */
export function typicalArticle(): string {
  return /^(8|11|18)/.test(String(TYPICAL_RATE * 100)) ? "An" : "A";
}

/** What one ticket at this naira price costs on the incumbent. */
export function typicalFeeNaira(priceNaira: number): number {
  return priceNaira * TYPICAL_RATE + TYPICAL_FLAT_NAIRA;
}
