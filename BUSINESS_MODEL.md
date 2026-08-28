# Paylance: The Creator OS Business Model

## 1. Overview
Paylance is a vertically integrated "Business-in-a-Box" platform designed for high-growth digital creators. It centralizes audience management, monetization, and growth analytics into a single, high-fidelity interface.

---

## 2. Revenue Streams (How We Make Money)

### A. A flat fee per ticket (the only revenue stream)

The platform is the financial infrastructure for creator transactions. We take a
fixed amount per paid ticket at the moment it sells — collected as the platform's
share of a split payment, never as a bill or a subscription.

**We take no percentage of revenue.** A creator selling a ₦50,000 ticket pays the
same as one selling a ₦2,000 ticket. This is the position, not a detail: it is
what separates us from Eventbrite and from Tix.Africa, and the whole product is
priced around it.

*   **Ticket sales**: ₦200 per paid ticket, whatever the ticket costs.
*   **Free events**: free. No fee is charged on a ₦0 ticket, ever.
*   **Offer sales**: same flat fee, same rail.

Creators pay nothing to sign up, nothing monthly, and nothing when they don't sell.

**For comparison**, on a ₦20,000 ticket:

| | Fee |
|---|---|
| Paylance | ₦200 |
| Tix.Africa free plan (5% + ₦100) | ₦1,100 |
| Tix Pro (3.5% + ₦100) | ₦800 |
| The old Paylance rate (9%) | ₦1,800 |

Checked August 2026. An earlier version of this file said Tix charged 8% + ₦100,
which was wrong and had reached the public pricing page — the corrected rate is
above. Verify before printing anything: these change.

The rate lives in `platform_fee_type` / `platform_fee_value` per creator, so it
can change without a migration, and `lib/money.ts` still supports a percentage
model for anyone who needs one.

**Open decision — the floor.** A flat ₦200 fee is most of a ₦300 ticket and all
of a ₦100 one (the fee is capped at what the buyer paid, so we never take more
than the ticket price — but on a very cheap ticket that cap means we take the
lot). Before launch this needs either a minimum ticket price or a fee capped at
a percentage of face value. It does not affect the ₦2,000+ tickets that are the
actual target.

### C. The fee that isn't ours

Paystack charges 1.5% + ₦100 on Nigerian cards, capped at ₦2,000, waived at or
under ₦2,500, plus 7.5% VAT on that fee. On anything above about ₦7,000 the
processor takes more per ticket than we do, and the organiser currently absorbs
it (`PROCESSING_FEE_BEARER` in `lib/payments/paystack.ts`).

That matters for positioning: an organiser judges the total deduction, not our
line of it. On a ₦20,000 ticket the real cost is roughly ₦630, of which ₦200 is
ours. Stating both openly would be unusual in this market and costs us nothing,
because every competitor's sellers pay the same processor.

**DECIDED — four bands.** A single ₦200 was ~10% of a ₦2,000 ticket and 0.13%
of a ₦150,000 one, across a market where prices span roughly 75x. The fee is
now banded by the ticket's own price:

| Ticket price | Fee | vs Tix free plan (5% + ₦100) |
|---|---|---|
| Under ₦7,500 | ₦200 | ₦200 – ₦475 |
| ₦7,500 – ₦30,000 | ₦450 | ₦475 – ₦1,600 |
| ₦30,000 – ₦75,000 | ₦1,500 | ₦1,600 – ₦3,850 |
| ₦75,000 and up | ₦2,500 | ₦3,850+ |

This is still "a flat fee per ticket, never a percentage" — there are simply
four of them. Sell twice as many tickets and you pay twice the fee; charge
twice as much and you do not.

**The boundaries are load-bearing, and they are not round numbers by accident.**
Each band's fee has to be lower than what a 5% + ₦100 competitor takes at the
CHEAPEST ticket in that band, or the band opens with us as the expensive
option. The break-evens are ₦2,000 for ₦200, ₦7,000 for ₦450, ₦28,000 for
₦1,500 and ₦48,000 for ₦2,500; every boundary is rounded up from one of those.

An earlier draft used the same fees against ₦5,000 / ₦20,000 / ₦75,000
boundaries. That version was more expensive than Tix across three separate
stretches — ₦5,000-₦7,000, ₦20,000-₦28,000, and everything under ₦2,000 —
including ₦5,000, one of the most common ticket prices in this market. Moving
a boundary down re-opens that hole. Check the arithmetic before touching them.

The band table lives in `PLATFORM_FEE_BANDS` in `lib/money.ts` and the pricing
page renders from it directly, so the published prices cannot drift from what
the engine charges.

**Open decision — the floor, again.** Below ₦2,000 no flat fee of ₦200 can beat
5% + ₦100, because their base fee is only ₦100. At ₦1,000 we take ₦200 and they
take ₦150. The site now says "from ₦2,000 up" rather than claiming we always
win, but the real fix is a minimum paid-ticket price of ₦2,000, or a ₦0 fee
below it. Still needs a call.

### B. Explicitly NOT revenue streams

These are ruled out by the no-custody constraint, not by preference. Paylance
never holds creator funds — the payment provider splits at transaction time and
settles the creator's share directly to their own bank account. Anything that
requires us to sit on money in between is off the table:

*   ~~Payout / withdrawal fees~~ — there is no withdrawal; money never reaches us.
*   ~~Instant payout premiums~~ — same reason.
*   ~~SaaS subscription tiers~~ — decided against. No monthly plans.
*   ~~A percentage of ticket revenue~~ — decided against. The flat fee is the pitch.

---

## 3. Value Proposition (Why Creators Choose Us)

### 🚀 Consolidation
Replaces multiple fragmented tools (Linktree, Eventbrite, Gumroad, Mailchimp) with a single unified dashboard.

### 📈 Revenue Optimization
Deep analytics (like the Event Revenue Analysis) help creators identify high-performing content and monetization channels, allowing them to focus on what actually pays.

### ✨ Professional Branding
Provides a stunning, premium "Storefront" that elevates the creator's brand identity far beyond standard social media links.

### 🛠️ Audience Ownership
Unlike social platforms, Paylance gives creators direct access to their "Audience" data, ensuring they own their business independently of algorithm changes.

---

## 4. Target Market
*   **High-Growth Creators**: Influencers, educators, and artists with active audiences looking to professionalize their monetization.
*   **Event Hosts**: Creators who primarily engage their audience through meetups, workshops, and virtual sessions.
*   **Anyone selling to an audience**: not limited to one country or region. Payment
    rails determine where we can operate first, not the positioning.

---

## 5. Strategic Goal
To become the **default operating system** for the creator economy, moving creators from "content makers" to "sustainable business owners."
