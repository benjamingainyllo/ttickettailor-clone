"use client";

import { useEffect, useState } from "react";

/**
 * The page's own address, read safely.
 *
 * Reading `window.location` during render is a hydration bug: the server has
 * no window and renders an empty string, the browser renders the real host,
 * React sees two different trees and throws. It shows up as a console error
 * on a page that otherwise looks fine, which is exactly the kind of thing
 * that goes unnoticed until something stranger breaks.
 *
 * So the value arrives after mount instead. The first paint shows nothing
 * where the host would be, which is a fraction of a second and is the right
 * trade for a page that hydrates cleanly.
 *
 * Returns "" until mounted, so callers can render a placeholder.
 */
export function useHost(): string {
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.host), []);
  return host;
}

/** The full origin, for building links somebody will copy. */
export function useOrigin(): string {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}
