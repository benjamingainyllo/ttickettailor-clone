import type { Kobo } from "@/lib/money";

/**
 * The card processing fee, and how to put it on the buyer.
 *
 * WHOSE FEE IS WHOSE. Paylance's fee is the organiser's to pay — it comes
 * out of what they set. The bank's fee for moving the money is the
 * buyer's, added to what they are charged. That is the decision, and this
 * module is how it is kept.
 *
 * Paystack itself only offers two bearers, "account" or "subaccount" —
 * neither of which is the buyer. The only way a buyer pays it is to
 * charge them more, which is what grossUpForProcessing() below works out.
 *
 * WHY IT NEEDS SOLVING RATHER THAN ADDING. The fee is a percentage of the
 * amount charged, and the amount charged includes the fee — so you cannot
 * just add it on. Charging ₦20,000 + the fee on ₦20,000 leaves the fee on
 * the difference uncovered. This works backwards to the charge that nets
 * the organiser exactly what they asked for.
 *
 * THE RATES ARE AN ESTIMATE, AND THE ERROR IS DELIBERATELY OURS. Paystack
 * deducts its real fee from our transaction_charge, so if this estimate is
 * a few kobo out, Paylance absorbs the difference and the organiser still
 * receives exactly the figure they were promised. That is the right way
 * round: we can measure and correct the estimate, an organiser cannot.
 */

/** Paystack's local-card rate. Nigeria, checked September 2026. */
const RATE_BPS = 150; // 1.5%
const FLAT_KOBO: Kobo = 10_000; // ₦100
/** Their fee is capped here, before tax. */
const CAP_KOBO: Kobo = 200_000; // ₦2,000
/** No fee at all at or below this. */
const WAIVED_AT_OR_BELOW_KOBO: Kobo = 250_000; // ₦2,500
/** VAT is charged on the fee itself, in basis points. */
const VAT_BPS = 750; // 7.5%

/**
 * What the bank will take from a charge of this size.
 *
 * Rounded UP, so the gross-up never comes out a kobo short and quietly
 * bill the shortfall to the organiser.
 */
export function processingFeeKobo(chargeKobo: Kobo): Kobo {
  if (!Number.isFinite(chargeKobo) || chargeKobo <= 0) return 0;
  if (chargeKobo <= WAIVED_AT_OR_BELOW_KOBO) return 0;

  const base = Math.min(
    Math.floor((chargeKobo * RATE_BPS) / 10_000) + FLAT_KOBO,
    CAP_KOBO
  );
  return Math.ceil((base * (10_000 + VAT_BPS)) / 10_000);
}

/**
 * The amount to charge the buyer so that `targetKobo` survives the bank's
 * fee.
 *
 * Solved by iteration rather than algebra on purpose. The fee is piecewise
 * — waived below one threshold, capped above another — so a closed form
 * needs a branch per piece and every branch is a chance to be subtly
 * wrong at a boundary. Iterating converges in a handful of steps because
 * the fee moves far slower than the charge, and the result is then
 * checked outright: this function never returns a number that fails.
 */
export function grossUpForProcessing(targetKobo: Kobo): Kobo {
  if (!Number.isFinite(targetKobo) || targetKobo <= 0) return 0;

  let charge = targetKobo;
  for (let i = 0; i < 40; i++) {
    const next = targetKobo + processingFeeKobo(charge);
    if (next === charge) break;
    charge = next;
  }

  // Round the buyer up to a whole naira first. Nobody in Lagos expects to
  // be charged ₦20,437.05, and the stray kobo reads as a mistake.
  //
  // Safe to do: the organiser's settlement is the charge minus our
  // transaction charge, and the rounding lands inside the processing part
  // of that charge — so the organiser is still paid to the kobo and the
  // rounding stays with Paylance.
  charge = Math.ceil(charge / 100) * 100;

  // THEN guarantee the invariant, in whole naira, because rounding up can
  // itself tip the charge into a marginally higher fee. It did: at a
  // ₦121,832 ticket the rounded charge cost one kobo more to process than
  // it had raised, so Paylance paid a kobo to make the sale. Checking
  // before rounding rather than after is exactly the kind of off-by-one
  // that never shows up until it is money.
  let guard = 0;
  while (charge - processingFeeKobo(charge) < targetKobo && guard < 1_000) {
    charge += 100;
    guard += 1;
  }

  return charge;
}
