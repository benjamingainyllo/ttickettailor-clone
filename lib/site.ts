/**
 * The public origin of this deployment.
 *
 * Needed in places that have no request to read a Host header from —
 * settlement runs inside a webhook, and the ticket links in an email have
 * to be absolute. Set NEXT_PUBLIC_SITE_URL in any real deployment.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  // Vercel's stable address for the live site — the one an organiser would
  // actually type. Preferred over VERCEL_URL, which is a different hostname
  // for every single deployment: a ticket link built from that keeps working
  // by luck, but points at a build rather than at the site, and reads like a
  // phishing link when it lands in somebody's inbox.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;

  // Preview builds only, where a per-deployment host is the right answer.
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export function ticketUrl(code: string): string {
  return `${siteUrl()}/ticket/${encodeURIComponent(code)}`;
}

export function orderTicketsUrl(reference: string): string {
  return `${siteUrl()}/tickets/${encodeURIComponent(reference)}`;
}
