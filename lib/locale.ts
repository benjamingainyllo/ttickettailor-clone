/**
 * Country and timezone options, in one place.
 *
 * Both the signup flow and Settings offer these. Kept together because two
 * copies of a list like this drift: somebody adds Zambia to one screen, and
 * an organiser who picked it at signup finds it missing when they go to
 * change it later.
 */

/**
 * Nigeria first because that is where this operates, then the rest of the
 * continent, then the markets an organiser is most likely to be running an
 * event from. Not the full ISO list — a dropdown of two hundred entries is
 * worse to use than one of thirty, and "Somewhere else" catches the rest.
 */
export const COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Tanzania", "Uganda",
  "Rwanda", "Senegal", "Côte d'Ivoire", "Cameroon", "Ethiopia", "Morocco",
  "United Kingdom", "United States", "Canada", "Ireland", "Germany", "France",
  "Netherlands", "Spain", "Portugal", "Italy", "United Arab Emirates",
  "Australia", "New Zealand", "India", "Somewhere else",
] as const;

/** Used when the browser cannot tell us and nothing has been chosen. */
export const DEFAULT_TIMEZONE = "Africa/Lagos";

/**
 * Every zone the browser knows, or a short list where it does not.
 *
 * Intl.supportedValuesOf is missing on older Safari, and an empty dropdown
 * would leave somebody unable to finish signing up — so the fallback covers
 * the regions that actually matter here rather than failing.
 */
export function timezones(): string[] {
  try {
    const all = (Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    }).supportedValuesOf?.("timeZone");
    if (all?.length) return all;
  } catch {
    /* falls through */
  }

  return [
    "Africa/Lagos", "Africa/Accra", "Africa/Abidjan", "Africa/Nairobi",
    "Africa/Johannesburg", "Africa/Cairo", "Europe/London", "Europe/Dublin",
    "Europe/Paris", "Europe/Berlin", "America/New_York", "America/Chicago",
    "America/Los_Angeles", "America/Toronto", "Asia/Dubai", "Asia/Kolkata",
    "Australia/Sydney",
  ];
}

/** Whatever zone this browser is in, falling back to Lagos. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
