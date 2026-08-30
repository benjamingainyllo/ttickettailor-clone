/**
 * Turning what somebody types into what a provider will accept.
 *
 * Nigerian numbers get written every way there is: 0803 123 4567,
 * +234 803 123 4567, 234-803-123-4567, (0803)1234567. WhatsApp wants
 * exactly one of those shapes — E.164 digits with no plus, no spaces —
 * and silently fails on the rest, so the conversion happens once, here,
 * rather than being half-done in three places.
 *
 * Nigeria is the default country because that is who this is for, but a
 * number typed with its own country code is left alone.
 */

/** Digits only, E.164 without the plus, or null when it can't be one. */
export function toE164(raw: string, defaultCountry = "234"): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return null;

  // Already carries the country code.
  if (digits.startsWith(defaultCountry) && digits.length >= 12) return digits;

  // Local form: a leading 0 stands in for the country code.
  if (digits.startsWith("0")) {
    const national = digits.slice(1);
    // Nigerian mobile numbers are 10 digits after the 0.
    if (national.length < 9) return null;
    return `${defaultCountry}${national}`;
  }

  // Typed without either — 8031234567.
  if (digits.length >= 9 && digits.length <= 11) return `${defaultCountry}${digits}`;

  // Some other country, typed in full.
  if (digits.length >= 11 && digits.length <= 15) return digits;

  return null;
}

/** For showing back to a person: +234 803 123 4567. */
export function formatE164(e164: string): string {
  if (e164.startsWith("234") && e164.length === 13) {
    return `+234 ${e164.slice(3, 6)} ${e164.slice(6, 9)} ${e164.slice(9)}`;
  }
  return `+${e164}`;
}

export function looksLikeAPhoneNumber(raw: string): boolean {
  return toE164(raw) !== null;
}
