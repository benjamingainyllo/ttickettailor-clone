/**
 * The marketing site's links.
 *
 * Kept in a plain module rather than beside the nav component, because the
 * nav is a client component: anything exported from there becomes a client
 * reference, and a server-rendered page (the footer, /features, /pricing)
 * can't map over one.
 */
export const MARKETING_NAV = [
  ["/explore", "Explore"],
  ["/features", "Features"],
  ["/pricing", "Pricing"],
  ["/event-types", "Event types"],
] as const;

/**
 * The footer's columns.
 *
 * ONLY LINKS TO PAGES THAT EXIST. The layout this follows has columns for
 * About, Press, Careers, a help centre, an iOS app and five social accounts.
 * We have none of those, and a footer full of dead links reads worse than a
 * short one that works.
 *
 * When a page or an account does exist, add it here and the column appears.
 * Obvious candidates, none of which are ready:
 *   Company  — About, Careers, Blog
 *   Support  — Contact, Help centre
 *   Socials  — Instagram, TikTok, X
 */
export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      ["/explore", "Explore events"],
      ["/features", "Features"],
      ["/pricing", "Pricing"],
      ["/sell", "What you'd keep"],
      ["/event-types", "Event types"],
    ],
  },
  {
    title: "Organisers",
    links: [
      ["/login", "Sign in"],
      ["/login", "Create an account"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/terms", "Terms of service"],
      ["/privacy", "Privacy policy"],
      ["/cookies", "Cookie policy"],
    ],
  },
] as const;
