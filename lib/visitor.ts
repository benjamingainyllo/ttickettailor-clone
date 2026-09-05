import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "crypto";

/**
 * Who is saving an event, when nobody has an account.
 *
 * A TICKET NEEDS NO ACCOUNT, SO A SAVE MUST NOT EITHER. Making a stranger
 * sign up before they can tap a star is how a discovery page ends up with
 * no signal on it at all — they leave instead. So the visitor is a random
 * id in a cookie: server-generated, opaque, and derived from nothing about
 * them. It identifies a browser and claims to be nothing more.
 *
 * IT IS NOT AN IDENTITY AND MUST NEVER BE TREATED AS ONE. Clearing cookies
 * makes a new visitor; two people sharing a laptop are one. That is fine
 * for "how many people want this" and useless for anything that has to be
 * right about a person, so nothing here may ever gate access to money,
 * tickets or an account.
 *
 * httpOnly, so a script on the page cannot read or forge it; sameSite lax,
 * so it survives arriving from a shared link; a year, because a save the
 * visitor made last month should still be there.
 */

export const VISITOR_COOKIE = "pl_visitor";
const A_YEAR = 60 * 60 * 24 * 365;

/** 32 hex characters. Comfortably inside the column's 16–64 check. */
export function newVisitorKey(): string {
  return randomBytes(16).toString("hex");
}

/** Whatever the browser already has. Null when it has nothing yet. */
export function readVisitorKey(): string | null {
  const value = cookies().get(VISITOR_COOKIE)?.value ?? null;
  if (!value) return null;
  // A key that fails the column's own constraint would make every write
  // throw, so a malformed cookie is treated as no cookie.
  return /^[a-f0-9]{16,64}$/.test(value) ? value : null;
}

/**
 * The key, minting and setting one if this is their first save.
 *
 * ONLY CALLABLE FROM A SERVER ACTION OR ROUTE HANDLER — Next refuses a
 * cookie write during a plain render, which is exactly right: a page that
 * quietly tags every reader would be tracking, and only an actual tap
 * should leave anything behind.
 */
export function ensureVisitorKey(): string {
  const existing = readVisitorKey();
  if (existing) return existing;

  const key = newVisitorKey();
  cookies().set(VISITOR_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: A_YEAR,
  });
  return key;
}
