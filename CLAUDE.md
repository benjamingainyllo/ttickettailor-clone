# Working on Paylance

## Who you are talking to

**Benjamin is a non-technical founder.** This is the most important thing on
this page. He owns the product and makes the business calls; he does not read
code and does not work in a terminal.

That means, always and without being asked:

- **Any instruction is a numbered, click-by-click list.** Where to go, what to
  click, what it looks like when it worked, and what to do if it didn't. Never
  a command with no explanation of what it does or where to type it.
- **Never assume a tool is familiar.** Terminal, `npm`, environment variables,
  `git`, deploys — name what a thing is the first time it comes up in a task,
  in one plain sentence.
- **Prefer the click-based path over the command-line one** when both exist
  (a hosting dashboard over a CLI, a web SQL editor over `psql`). Only reach
  for a terminal when there is genuinely no other way, and then give the exact
  text to paste and say what should come back.
- **Say what it will look like when it works.** He can't infer success from a
  silent exit code.
- **Long instructions belong in an Artifact**, not in terminal scrollback he
  has to scroll back through while working in another window.

Technical depth still belongs in commit messages, code comments and the repo
docs — that's for whoever maintains this later. It does not belong in replies
to him. Explain what changed and what it means for the product, not how the
code does it.

Two things he does want in plain terms, because they are his decisions:
open questions that need a business call, and anything that could cost money
or lose data.

## How this gets to the live site

**Vercel deploys `main`. Only `main`.** Work can happen on a branch, but a
push to a branch changes nothing Benjamin can see — it has to reach `main`
or it isn't shipped.

This has already gone wrong once: five commits sat on a side branch across
several sessions while Benjamin was told each time that the change was
"live in two minutes". It wasn't. He found out by looking at his own site.

So: push to `main`, and only say something is live once it is on `main`.
If a change genuinely needs review first, say plainly that it is waiting to
be merged rather than describing it as deployed. Never report a deploy that
hasn't happened.

The live site is https://benjamin-ticket.vercel.app and the Supabase
project ref is `fpximoqxdutedhxiqvlo` — its dashboard URLs are
`https://supabase.com/dashboard/project/fpximoqxdutedhxiqvlo/...`, which
saves sending him hunting through menus.

## What this product is

Paylance is an **event ticketing platform**, Nigeria-first.

- **4% of a ticket, and never more than ₦3,000.** Under ₦2,000 a ticket, and
  on free events, we charge nothing. The cap is the pitch — past ₦75,000 a
  ticket the fee stops growing, while a percentage competitor keeps taking
  its cut. The rate, cap and free floor all live in `lib/money.ts`; the
  pricing page and the calculator read them from there and must never
  restate them by hand.
- **The competition charges 8% + ₦100, per seat, added on top so the buyer
  pays it.** Verified 1 September 2026 off nine live ticket types on Tix's
  own checkout. This was published as 5% for weeks on no evidence and
  understated us by about half — check a live checkout before changing it.
- **No custody, ever.** Payments split at transaction time and the organiser's
  share settles directly to their own bank. There is no wallet, no balance and
  no withdrawal anywhere in the product, by design. Anything implying Paylance
  holds creator funds is out of scope.
- Money is always **integer kobo**, and every conversion goes through
  `lib/money.ts`. Never naira, never a float.
- Payments (`lib/payments/`) and email (`lib/email/`) sit behind provider
  interfaces. Nothing outside those folders names a vendor. Both fall back to
  a demo/console implementation when no key is set, so the whole flow runs
  end to end with no accounts at all.
- `setup.sql` is the only SQL file, and it is idempotent — safe to run any
  number of times.

## Open decision

None on pricing. The old worry — a ₦200 flat fee swallowing a ₦100 ticket —
was resolved first by the free floor and then by moving to a percentage:
a ₦100 ticket now costs the organiser nothing.
