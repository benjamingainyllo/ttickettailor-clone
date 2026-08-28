/**
 * The details every legal page needs, in one place.
 *
 * The three legal pages read from here rather than repeating any of it, so
 * a company name or an address is corrected once and is right everywhere.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BEFORE LAUNCH, THESE MUST BE REAL.
 *
 *  Anything left as a placeholder below renders visibly as a placeholder on
 *  the live page. That is deliberate: an unfinished legal page is obvious
 *  and fixable, whereas an invented company number or address is a
 *  misrepresentation that sits there looking finished. Never fill these in
 *  with a guess.
 *
 *  A payment provider will ask for these pages during onboarding, and they
 *  read them.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Marks a value that has not been supplied yet. */
const TODO = (what: string) => `[${what}]` as const;

export const LEGAL = {
  /** Trading name. Changes when the rename lands. */
  product: "Paylance",

  /** The registered company that actually contracts with users. */
  entity: TODO("REGISTERED COMPANY NAME"),

  /** CAC registration number, e.g. "RC 1234567". */
  registration: TODO("CAC REGISTRATION NUMBER"),

  /** Registered office address. */
  address: TODO("REGISTERED ADDRESS"),

  /** Where users write about their account, a complaint, or their data. */
  contactEmail: TODO("CONTACT EMAIL"),
  privacyEmail: TODO("PRIVACY CONTACT EMAIL"),

  /** The country whose courts and law govern the agreement. */
  jurisdiction: "Nigeria",

  /** Public site. */
  site: "https://ttickettailor-clone.vercel.app",

  /** Shown at the top of each page. Update whenever the wording changes. */
  updated: "28 August 2026",
} as const;

/** True when a value is still a placeholder, so pages can flag themselves. */
export const isPlaceholder = (value: string) =>
  value.startsWith("[") && value.endsWith("]");

/** Every field that still needs a real value. */
export const missingLegalDetails = (): string[] =>
  Object.entries(LEGAL)
    .filter(([, v]) => typeof v === "string" && isPlaceholder(v))
    .map(([k]) => k);

/**
 * The companies that handle data on our behalf.
 *
 * Naming a vendor is avoided everywhere else in the product on purpose —
 * but a privacy notice that does not say who receives personal data is not
 * a privacy notice. This list is the one place a vendor name belongs, and
 * it has to stay accurate: adding a service that touches user data means
 * adding a row here in the same change.
 */
export const PROCESSORS = [
  {
    name: "Paystack",
    role: "Payments",
    what: "Buyer name, email and card or bank details; the organiser's bank account for settlement.",
    where: "Nigeria and the United States",
  },
  {
    name: "Supabase",
    role: "Database, accounts and file storage",
    what: "Everything you or your buyers enter: account details, events, orders and tickets.",
    where: "Outside Nigeria, depending on the region the project runs in",
  },
  {
    name: "Vercel",
    role: "Hosting and site analytics",
    what: "Technical request data — pages viewed, approximate country, browser type.",
    where: "Global content network",
  },
  {
    name: "Resend",
    role: "Email delivery",
    what: "The recipient's email address and the contents of tickets and receipts.",
    where: "United States",
  },
] as const;
