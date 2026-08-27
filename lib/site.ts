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

  // Vercel supplies this automatically on preview and production builds.
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
