/**
 * The public origin of this deployment.
 *
 * Needed in places that have no request to read a Host header from —
 * settlement runs inside a webhook, and the ticket links in an email have
 * to be absolute.
 *
 * WHY THIS IS DEFENSIVE RATHER THAN JUST READING THE VARIABLE.
 *
 * The setup guide used to say: put `https://placeholder.com` in
 * NEXT_PUBLIC_SITE_URL for now, and come back to fix it later. Nobody ever
 * comes back. The result was a live site where every absolute link the
 * server built — the ticket link in a buyer's email, the link in their
 * WhatsApp message, the share preview on an event page, an organiser's
 * referral link — pointed at a parked domain owned by somebody else.
 *
 * Nothing failed loudly. Checkout worked, tickets were issued, mail was
 * sent; the links inside it were simply dead. That is the worst shape a
 * bug can take, so a value that is obviously a placeholder is now ignored
 * in favour of the address the host platform reports, and the misconfigured
 * deployment heals itself on its next deploy.
 */

/**
 * Hostnames that mean "somebody hasn't filled this in yet".
 *
 * Deliberately a short, explicit list of the ones a setup guide or a
 * copy-pasted template actually produces. It is NOT an attempt to guess
 * whether a real domain is the right one — a wrong-but-real domain is a
 * decision, and silently overriding it would be worse than honouring it.
 */
const PLACEHOLDER_HOSTS = new Set([
  "placeholder.com",
  "www.placeholder.com",
  "example.com",
  "www.example.com",
  "example.org",
  "example.net",
  "yourdomain.com",
  "your-domain.com",
  "yoursite.com",
  "your-site.com",
]);

/**
 * The configured origin, or null when it is missing, unusable, or one of
 * the placeholders above.
 */
function configuredSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    // Not a URL at all ("benjamin-ticket.vercel.app" with no scheme, say).
    // Falling through beats emitting a link no browser can follow.
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (PLACEHOLDER_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  return raw.replace(/\/$/, "");
}

export function siteUrl(): string {
  const configured = configuredSiteUrl();
  if (configured) return configured;

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

/**
 * True when NEXT_PUBLIC_SITE_URL is set to something unusable and is being
 * ignored. The dashboard uses this to say so out loud, because a link that
 * quietly works by fallback is one deploy away from being wrong again.
 */
export function siteUrlIsMisconfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()) && configuredSiteUrl() === null;
}

export function ticketUrl(code: string): string {
  return `${siteUrl()}/ticket/${encodeURIComponent(code)}`;
}

export function orderTicketsUrl(reference: string): string {
  return `${siteUrl()}/tickets/${encodeURIComponent(reference)}`;
}
