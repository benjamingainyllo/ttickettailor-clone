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

## What this product is

Paylance is an **event ticketing platform**, Nigeria-first.

- **A flat fee per ticket — ₦200 — and no percentage of revenue.** This is the
  whole pitch, and the landing page is built around it. Free events are free.
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

The ₦200 flat fee is the entire ticket price on a ₦100 ticket (the fee is
capped at what the buyer paid, so we never take more than the ticket). Before
launch this needs a minimum ticket price or a percentage cap. Raise it; don't
silently pick a policy.
