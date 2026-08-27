# Paylance

Event ticketing platform built with Next.js 14, Tailwind CSS, Supabase and Paystack.

This README is the living product and execution document. We will update it continuously as features ship.

## Product Positioning

**Paylance sells tickets. A flat fee per ticket, no cut of your revenue, and the
money lands in your own bank account.**

Two things follow from that, and they are the product:

1. **We don't take a percentage.** ₦200 a ticket whether it sells for ₦2,000 or
   ₦50,000. Free events cost nothing. This is what separates us from Eventbrite
   and Tix.Africa, both of which scale their cut with the organiser's success.
2. **We never hold the money.** Payments split at transaction time and the
   organiser's share settles directly to their bank. There is no wallet, no
   balance and no withdrawal anywhere in the product, by design.

Around the ticketing core the app still runs offers, audience and revenue for
the same creator — but ticketing is the wedge, and the thing we are best at.

## Current Stack

- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- UI: Custom components (Shadcn-ready architecture)
- Database/Auth/Storage: Supabase
- Payments: Paystack, behind a provider interface (`lib/payments/`)
- Email: Resend, behind a provider interface (`lib/email/`)
- QR: `qrcode` server-side for rendering, `jsqr` in the browser for scanning
- Charts: Recharts

## Current Build Status

- Core folders initialized:
  - `components`
  - `app/(dashboard)`
  - `app/(storefront)`
  - `lib`
- Dashboard screens implemented:
  - `Overview`
  - `Offers`
  - `Audience`
  - `Revenue`
  - `Automations`
  - `Experiments`
  - `Integrations`
  - `Settings`
- Legacy routes redirected for compatibility:
  - `/home` -> `/overview`
  - `/store` -> `/offers`
  - `/income` -> `/revenue`
  - `/customers` -> `/audience`
  - `/analytics` -> `/experiments`
- Theme support added:
  - "Blue Eclipse" Dark theme and Light mode toggle
- Branding updates:
  - Bricolage Grotesque font
  - Sidebar profile section pinned to bottom
  - Custom avatar integrated
  - Currency currently Naira (₦) — see the open question on multi-currency below
- Utilities:
  - Supabase client bootstrap
  - `lib/money.ts` — integer-kobo conversion, formatting and platform fee calculation
  - `lib/payments/` — provider-agnostic payment interface
- Commerce core (no-custody rail):
  - Payments run on split transactions with per-creator subaccounts — a buyer's payment
    splits at transaction time and the creator's share settles **directly to their own
    bank account**. Paylance never holds creator funds, so there is no wallet, no balance
    and no withdrawal anywhere in the product.
  - Money is stored and computed as integer kobo (`*_kobo`, `bigint`) via `lib/money.ts`
  - Payment logic sits behind a provider interface in `lib/payments/`; no column or module
    outside that folder is named after a processor
  - Shared `orders` ledger across Offers and Events, plus `settlements`, `payout_accounts`
    and `webhook_events` (idempotent webhook handling)
  - Offers and Events are created as **drafts**; publishing a paid item requires a
    connected bank account, enforced in a server action *and* a database trigger
  - Payouts is bank connection + read-only settlement history
  - Requires running `setup.sql` in Supabase — one file, safe to re-run
- Ticketing, end-to-end:
  - **Ticket types.** An event sells priced tiers ("Early Bird", "GA", "VIP"),
    each with its own allocation, per-order limit and optional sale window.
    `events.price_kobo` is now derived — a trigger keeps it mirroring the
    cheapest active tier, so it stays the event's "from" price.
  - **Real tickets.** A paid order mints one `tickets` row per admission with a
    unique scannable code. Issuance is idempotent on `(order_id, seat_index)`,
    so a replayed webhook cannot double-issue.
  - **Delivery.** Settlement issues the tickets and emails them. Buyers get a
    ticket page per admission (`/ticket/[code]`) and one for the whole purchase
    (`/tickets/[reference]`), each with a server-rendered QR code.
  - **Check-in.** A mobile door page at `/events/[id]/door` scans QR codes with
    the native `BarcodeDetector` where it exists and falls back to jsQR, with
    manual code entry always available. Admission is a guarded UPDATE, so two
    phones scanning the same ticket cannot both be told to let someone in.
  - **Inventory.** Allocation is decided in one atomic statement
    (`reserve_ticket_inventory`), so two buyers cannot both win the last ticket.
    A failed or abandoned checkout hands the seats back.
  - Creator: create event (cover image, date/time, location, tiers), dashboard
    list, detail view and a Tickets tab for managing tiers
  - Public: storefront `Events` tab and standalone `/event/[id]` page with a
    tier picker and quantity stepper
  - Backend: signature-verified webhook at `/api/webhooks/payments` settles
    orders idempotently; event revenue is derived from `orders`, never
    accumulated on the row
  - Requires `setup.sql` and `SUPABASE_SERVICE_ROLE_KEY`. A payment key and an
    email key are both optional — see the demo modes below.

## Pricing

Paylance charges a **flat fee per paid ticket — ₦200 — and no percentage of
revenue**. Free tickets are never charged a fee. See `BUSINESS_MODEL.md` for
the reasoning and the one open decision (a floor for very cheap tickets).

The rate is stored per creator in `platform_fee_type` / `platform_fee_value`, so
it changes without a migration, and `lib/money.ts` still supports a percentage
model. `calculateOrderPlatformFeeKobo` is quantity-aware: computing a flat fee
from an order total would charge once for a four-ticket purchase.

## Open question: currency and reach

Positioning is global — anyone selling to an audience can use Paylance. The money
layer is not there yet, and the gap is worth being honest about:

- All amounts are stored as integer **kobo** and formatted as **₦** (`lib/money.ts`).
- Payments run through Paystack, which covers Nigeria, Ghana, South Africa and Kenya —
  not "anyone, anywhere".
- The bank-connection flow requests a Nigerian bank list.

None of this blocks the current build, and `lib/payments/` exists precisely so another
processor can be added without touching checkout. But before marketing to creators
outside those markets, we need a decision on multi-currency storage/display and a
second payment provider.

## Product Roadmap (Suggested)

### 0) Ticketing depth — the next block

The spine is built (tiers, tickets, QR, email, check-in). Still missing against
a mature ticketing product:

- Discount codes and promo scheduling
- Custom attendee questions at checkout
- Embeddable widget for selling from the creator's own site
- Tracking links, to see which channel actually sold
- Per-attendee names on multi-ticket orders
- Box offices: grouping events under one organiser identity

### 1) Smart Checkout & Conversion

- Order bumps and one-click upsells
- Coupon engine and discount scheduling
- Abandoned checkout recovery

### 2) Memberships & Recurring Revenue

A product a creator sells to *their own* audience — not a Paylance plan.
Paylance itself has no subscription tiers; we earn only from transaction fees.

- Monthly/yearly subscriptions creators offer their audience
- Tiered access and gated content
- Churn and retention analytics

### 3) Audience CRM

- Buyer and lead tagging
- Segment-based broadcast campaigns
- Email and WhatsApp workflow triggers

### 4) Affiliate & Referrals

- Creator affiliate links
- Commission tracking
- Referral payout management

### 5) Product Protection

- Expiring download links
- Limited download count
- Watermarking for digital assets

### 6) Revenue Intelligence

- Cashflow forecast
- Payout and fee transparency

> Note: anything implying Paylance holds creator funds (wallet, balance,
> withdrawal, "safe-to-withdraw") is out of scope by design — settlement goes
> directly to the creator's bank via split payments.

## UX/Brand Direction (Not a Clone)

To avoid looking like a copy, the app should evolve into a distinct visual identity:

- New information architecture:
  - `Overview`, `Offers`, `Audience`, `Revenue`, `Automations`, `Experiments`
- Unique dashboard personality:
  - Accent packs (Indigo, Emerald, Sunset, Mono)
- Strong micro-interactions:
  - Animated KPI counters, richer hovers, progressive reveal panels
- More dynamic storefront:
  - Featured offers, social proof strips, countdowns, testimonials

## 30-Day Execution Plan

- Week 1: Rebrand UI system + navigation redesign
- Week 1 status: Completed
- Week 2: Offer builder + upsell checkout MVP
- Week 3: CRM tagging + broadcast flows
- Week 4: Membership tiers + analytics v2 + experiment lab MVP

## Demo mode (no payment gateway required)

With no payment provider key set, the app runs on a mock provider in
`lib/payments/mock.ts`. Everything works end to end — connect a pretend bank,
publish paid items, run a checkout, watch the order appear in Revenue — but no
money moves and nothing talks to a processor. Checkout redirects to
`/checkout/demo`, where a payment can be completed or failed by hand; it then
settles through the same `settleOrder` path a real webhook uses.

Demo mode turns itself off the moment `PAYMENTS_PROVIDER_SECRET_KEY` (or
`PAYSTACK_SECRET_KEY`) exists. The demo checkout actions refuse to run once a
real key is present, so this cannot be left on by accident.

Email works the same way. With no `EMAIL_PROVIDER_API_KEY` (or `RESEND_API_KEY`)
set, `lib/email/mock.ts` prints the message to the server console — including
the ticket links — instead of sending it, so the whole purchase-to-door flow
runs with no email account at all. `lib/email/` mirrors `lib/payments/`: nothing
outside that folder knows which service delivers the mail.

Still required either way: `SUPABASE_SERVICE_ROLE_KEY`, which the server uses
to record orders, issue tickets and connect payout accounts. Set
`NEXT_PUBLIC_SITE_URL` in any real deployment — ticket links in emails are
absolute and there is no request to infer a host from inside a webhook.

## Database

`setup.sql` is the only SQL file. Run the whole thing in the Supabase SQL Editor.
It creates what's missing, skips what already exists, and migrates older
naira columns to kobo — so it is safe to run at any time, as many times as
you like. It replaces the previous five overlapping files, which had to be run
in an undocumented order and failed partway through on a second run.

Verified against a real PostgreSQL 16 instance: it applies cleanly from empty,
and re-applies cleanly twice more with no errors. The rules it enforces were
tested rather than assumed — the publish gate refuses a paid item with no bank
account connected (and a paid tier bolted onto an already-published event),
`events.price_kobo` tracks the cheapest active tier, issuance is idempotent
under a replayed webhook, and with 20 concurrent sessions racing for one
remaining ticket exactly one wins.

## Setup

See **[SETUP.md](SETUP.md)** for the full walkthrough: creating the Supabase
project, running the schema, the keys you need, and selling and scanning a
first ticket end to end. Copy `.env.example` to `.env.local` to start.

## Development

Install dependencies and run:

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000` — the landing page
- `http://localhost:3000/overview` — the dashboard

## Update Protocol

When updating this file, keep sections in this order:

1. Product Positioning
2. Current Stack
3. Current Build Status
4. Product Roadmap
5. UX/Brand Direction
6. Execution Plan
7. Development

Every shipped feature should update:

- `Current Build Status`
- The corresponding roadmap item status (if started/completed)
