/**
 * What a figure is about, and therefore what colour it wears.
 *
 * ONE PLACE, SO GREEN ALWAYS MEANS THE SAME THING. The moment two screens
 * each pick their own "nice green for money", the colour stops being
 * information and becomes decoration — and a reader who has learned that
 * green is money on the dashboard has to learn it again on every page.
 *
 * Pure, and deliberately not server-only: server components render these
 * and client components render them too.
 */

export type Tone = "money" | "count" | "fee" | "risk" | "group" | "neutral";

/** The ink. Charts, sparklines, keylines, small-caps labels. */
export const TONE_INK: Record<Tone, string> = {
  money: "var(--dl-money)",
  count: "var(--dl-count)",
  fee: "var(--dl-fee)",
  risk: "var(--dl-risk)",
  group: "var(--dl-group)",
  neutral: "var(--dl-ink-faint)",
};

/** The pale ground. Panel headers and figure tiles only — never text. */
export const TONE_WASH: Record<Tone, string> = {
  money: "var(--dl-money-wash)",
  count: "var(--dl-count-wash)",
  fee: "var(--dl-fee-wash)",
  risk: "var(--dl-risk-wash)",
  group: "var(--dl-group-wash)",
  neutral: "var(--dl-neutral-wash)",
};

/**
 * The literal hexes, for the one place that cannot take a CSS variable:
 * an inline SVG gradient stop, which needs a real colour to interpolate.
 */
export const TONE_HEX: Record<Tone, string> = {
  money: "#17714A",
  count: "#4257C4",
  fee: "#8A5A00",
  risk: "#C9294A",
  group: "#7B4FA8",
  neutral: "#6C6478",
};

/** A pale step of the same hue, for the empty half of a meter. */
export const TONE_TRACK: Record<Tone, string> = {
  money: "#CFE5DA",
  count: "#CFD6F2",
  fee: "#EFE0BC",
  risk: "#F4D2D9",
  group: "#E2D4EE",
  neutral: "#E4E0EA",
};
