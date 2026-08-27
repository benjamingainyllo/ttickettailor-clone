/**
 * The marketing site's links.
 *
 * Kept in a plain module rather than beside the nav component, because the
 * nav is a client component: anything exported from there becomes a client
 * reference, and a server-rendered page (the footer, /features, /pricing)
 * can't map over one.
 */
export const MARKETING_NAV = [
  ["/features", "Features"],
  ["/pricing", "Pricing"],
  ["/event-types", "Event types"],
] as const;
