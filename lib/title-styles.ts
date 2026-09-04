/**
 * The seven faces an event title can wear.
 *
 * WHY THIS EXISTS. Every event on Paylance has the same fields, so without
 * something like this every flyer looks like the same flyer. The title is
 * where an organiser's taste actually shows, and letting them set it costs
 * us one column and no money.
 *
 * ONE SOURCE OF TRUTH. The picker in the dashboard, the public event page
 * and the CHECK constraint in setup.sql all describe the same seven ids.
 * If you add a style here, add it to that constraint in the same commit or
 * the database will refuse the save with an error nobody can read.
 *
 * WHY WEIGHT AND TRACKING LIVE HERE TOO. These faces disagree wildly at
 * display size — Pinyon Script needs air and a lighter hand, Abril Fatface
 * needs tightening or it looks like a shouted headline. Bundling the
 * adjustment with the family is what stops "Fancy" rendering as a cramped
 * mess on one screen and fine on another.
 */

export type TitleStyleId =
  | "classic"
  | "eclectic"
  | "fancy"
  | "literary"
  | "digital"
  | "elegant"
  | "simple";

export interface TitleStyle {
  id: TitleStyleId;
  /** What the organiser sees in the picker, set in its own face. */
  label: string;
  /** A CSS font-family value, always ending in a real fallback. */
  family: string;
  /** Tailwind-free inline styles, so this works anywhere. */
  weight: number;
  letterSpacing: string;
  /** Some faces sit small at the same px size and need a nudge. */
  scale: number;
  italic?: boolean;
}

export const TITLE_STYLES: readonly TitleStyle[] = [
  {
    id: "classic",
    label: "Classic",
    family: "var(--font-bricolage-grotesque), 'Helvetica Neue', Arial, sans-serif",
    weight: 800,
    letterSpacing: "-0.045em",
    scale: 1,
  },
  {
    id: "eclectic",
    label: "Eclectic",
    family: "var(--font-abril-fatface), Georgia, 'Times New Roman', serif",
    weight: 400,
    letterSpacing: "-0.02em",
    scale: 1,
  },
  {
    id: "fancy",
    label: "Fancy",
    // A script has almost no x-height, so at the same px size it reads as
    // half the size of everything else. The scale is not decoration.
    family: "var(--font-pinyon-script), 'Snell Roundhand', cursive",
    weight: 400,
    letterSpacing: "0",
    scale: 1.32,
  },
  {
    id: "literary",
    label: "Literary",
    family: "var(--font-instrument-serif), Georgia, 'Times New Roman', serif",
    weight: 400,
    letterSpacing: "-0.015em",
    scale: 1.04,
    italic: true,
  },
  {
    id: "digital",
    label: "Digital",
    family: "var(--font-space-mono), ui-monospace, 'SF Mono', Menlo, monospace",
    weight: 700,
    letterSpacing: "-0.04em",
    scale: 0.9,
  },
  {
    id: "elegant",
    label: "Elegant",
    family: "var(--font-cormorant), 'Didot', Georgia, serif",
    weight: 600,
    letterSpacing: "0.01em",
    scale: 1.14,
  },
  {
    id: "simple",
    label: "Simple",
    // Deliberately the system stack: "Simple" should cost the buyer zero
    // bytes, and on a Lagos phone on mobile data that is a real feature
    // rather than a purist's flourish.
    family:
      "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    weight: 700,
    letterSpacing: "-0.02em",
    scale: 1,
  },
] as const;

export const DEFAULT_TITLE_STYLE: TitleStyleId = "classic";

const BY_ID = new Map(TITLE_STYLES.map((s) => [s.id, s]));

/**
 * Never throws and never returns undefined.
 *
 * The value arrives from a database column that an older row may not have,
 * or that a future version of the app may have written a style we don't
 * know yet. A public event page must render either way — a missing font is
 * a bad flyer, an exception is no flyer at all.
 */
export function titleStyle(id: string | null | undefined): TitleStyle {
  return BY_ID.get((id ?? "") as TitleStyleId) ?? BY_ID.get(DEFAULT_TITLE_STYLE)!;
}

/**
 * Inline styles for a title that has to survive a phone and a desktop.
 *
 * The per-face scale has to be applied to BOTH ends of the clamp, not to
 * a finished value — a script set to shrink to 32px on a phone is already
 * illegible at 32, so the floor has to move with the face too.
 */
export function titleStyleCssClamp(
  id: string | null | undefined,
  minPx: number,
  maxPx: number
): React.CSSProperties {
  const s = titleStyle(id);
  return {
    fontFamily: s.family,
    fontWeight: s.weight,
    letterSpacing: s.letterSpacing,
    fontStyle: s.italic ? "italic" : "normal",
    fontSize: `clamp(${Math.round(minPx * s.scale)}px, 7.5vw, ${Math.round(
      maxPx * s.scale
    )}px)`,
    lineHeight: 1.02,
  };
}

/** Inline styles for rendering a title in a given face at a given size. */
export function titleStyleCss(
  id: string | null | undefined,
  basePx: number
): React.CSSProperties {
  const s = titleStyle(id);
  return {
    fontFamily: s.family,
    fontWeight: s.weight,
    letterSpacing: s.letterSpacing,
    fontStyle: s.italic ? "italic" : "normal",
    fontSize: `${Math.round(basePx * s.scale)}px`,
    lineHeight: 1.02,
  };
}
