# Setting up Paylance

Getting from a fresh clone to selling a ticket and scanning it at the door.
Budget about fifteen minutes. Nothing here costs money — Supabase's free tier
is enough, and payments and email both run in demo mode until you say otherwise.

You need three things: a Supabase project, the database schema, and a `.env.local`
file. In that order.

---

## 1. Create a Supabase project

This is the only part nobody can do for you — it needs your account.

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub login is quickest).
2. **New project**. Give it a name, set a database password, and pick the region
   closest to your users — for Nigeria that's usually `eu-west-1` or `eu-central-1`.
3. Wait for it to finish provisioning. Takes a minute or two.

## 2. Run the schema

1. In your project, open **SQL Editor** in the left sidebar.
2. Open `setup.sql` from this repo, copy the whole file, paste it in.
3. Press **Run**.

You should see *"Success. No rows returned."*

`setup.sql` is the only SQL file, and it is safe to run again at any time — it
creates what's missing and skips what's already there. If you pull a change that
touches the schema, re-run the whole thing.

It creates ten tables (`profiles`, `events`, `ticket_types`, `tickets`, `orders`,
`audience`, `payout_accounts`, `settlements`, `webhook_events`, `offers`), the
storage buckets for images, row-level security on everything, and the triggers
that enforce the rules the app depends on.

## 3. Get your keys

In your Supabase project: **Project Settings → API**. You need three values.

| Where it appears | What to copy |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

Then, in the repo:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste the three values in.

> **The `service_role` key bypasses every security rule in the database.** It
> belongs on the server and nowhere else. It has no `NEXT_PUBLIC_` prefix, which
> is what stops Next.js from bundling it into browser code — don't add one, and
> don't paste it anywhere public.

## 4. Turn off email confirmation (while you're testing)

By default Supabase makes new accounts confirm their email before they can sign
in, which is a nuisance when you're trying things out.

**Authentication → Sign In / Providers → Email**, and turn off *Confirm email*.

The app handles both settings correctly — with confirmation on, signup tells you
to check your inbox. Turn it back on before you launch.

## 5. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

---

## Your first ticket, end to end

Worth doing once, so you've seen the whole loop work:

1. **Sign up** at `/login`, and complete onboarding.
2. **Connect a bank account** at `/payouts`. In demo mode any plausible-looking
   account number works — nothing is sent to a real bank. You need this before
   you can publish anything paid: it's enforced in the app *and* in a database
   trigger, so there's no way around it.
3. **Create an event** at `/events` → New event. It saves as a draft.
4. **Open the event → Tickets tab.** The price you typed became a "General
   Admission" tier. Add a second one — an Early Bird at a lower price, limited
   to 5 — so you can see tiers working.
5. **Publish it**, then **Copy link** and open that link in a private window.
   That's what a buyer sees: pick a tier, choose a quantity, enter name and email.
6. **Pay.** In demo mode you land on `/checkout/demo` — press *Simulate
   successful payment*. It settles through exactly the same code path a real
   Paystack webhook uses.
7. **Check the terminal running `npm run dev`.** The ticket email is printed
   there, with the links in it. Open one.
8. **Scan it.** Back in the dashboard, open the event and press **Door**. Point
   your phone's camera at the QR on screen, or switch to *Type it* and enter the
   code. It should say **Let them in** — and scanning the same ticket a second
   time should say **Already used**.

That's the whole product.

---

## Going live

Everything above works with no payment or email account at all. When you're ready:

**Payments.** Get a Paystack secret key and set `PAYMENTS_PROVIDER_SECRET_KEY`.
Demo checkout disables itself the moment that key exists, so it can't be left on
by accident. Point your Paystack webhook at `https://yourdomain.com/api/webhooks/payments`
— settlement is idempotent, so a replayed event can't double-count or issue
tickets twice.

**Email.** Get a [Resend](https://resend.com) API key, set
`EMAIL_PROVIDER_API_KEY`, and set `EMAIL_FROM` to an address at a domain you've
verified with them. Until you verify a domain you can only send to your own
address.

**Site URL.** Set `NEXT_PUBLIC_SITE_URL` to your real domain. Ticket links in
emails are absolute, and a webhook has no incoming request to infer a host from,
so leaving this on localhost means broken links in real emails.

Both providers sit behind interfaces (`lib/payments/`, `lib/email/`), so swapping
either is one file and one environment variable.

---

## When something's wrong

**"Could not load..." everywhere, and the browser console shows failed requests**
— `NEXT_PUBLIC_SUPABASE_URL` or the anon key is wrong. Both are read at build
time, so restart `npm run dev` after editing `.env.local`.

**Orders don't appear after a successful checkout** — `SUPABASE_SERVICE_ROLE_KEY`
is missing or wrong. The server needs it to write orders and tickets. `/integrations`
tells you exactly which keys it can and can't see.

**"Connect a bank account before publishing a paid item"** — that's the publish
gate doing its job. Connect one at `/payouts`. A free event publishes without one.

**Signup appears to do nothing** — email confirmation is on and the message is
sitting in your inbox (or spam). See step 4.

**The door page says "No camera access"** — browsers only allow camera access
over HTTPS or on `localhost`. Testing from a phone against your laptop's IP
address won't get a camera; use the *Type it* tab, or deploy somewhere with HTTPS.
