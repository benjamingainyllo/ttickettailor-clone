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
| Tix.Africa (8% + ₦100) | ₦1,700 |
| The old Paylance rate (9%) | ₦1,800 |

The rate lives in `platform_fee_type` / `platform_fee_value` per creator, so it
can change without a migration, and `lib/money.ts` still supports a percentage
model for anyone who needs one.

**Open decision — the floor.** A flat ₦200 fee is most of a ₦300 ticket and all
of a ₦100 one (the fee is capped at what the buyer paid, so we never take more
than the ticket price — but on a very cheap ticket that cap means we take the
lot). Before launch this needs either a minimum ticket price or a fee capped at
a percentage of face value. It does not affect the ₦2,000+ tickets that are the
actual target.

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
