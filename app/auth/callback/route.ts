import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { REFERRAL_COOKIE, recordReferral } from "@/lib/referrals";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * The landing point for every link we send by email, and for Google.
 *
 * THIS ROUTE DID NOT EXIST, and its absence broke sign-up completely.
 *
 * The browser client runs the PKCE flow, so clicking the link in a signup
 * email does not hand back a session — it hands back a one-time `code` in
 * the query string that has to be traded for one on the server. Nothing was
 * doing that trade. The link pointed straight at /onboarding, which is a
 * protected route, so the middleware saw no session, bounced to /login, and
 * the account was left with a confirmed address and no password. Which is
 * to say: signing up appeared to work, and then there was no way in. That is
 * the "I'm trying to log in but it's not working".
 *
 * Two shapes arrive here and both are handled:
 *
 *   ?code=...                    PKCE. What Supabase's own default email
 *                                templates and every OAuth provider send.
 *                                Requires the code-verifier cookie, so it
 *                                only works in the browser that started it.
 *
 *   ?token_hash=...&type=...     What our own templates send. Carries no
 *                                browser state, so the link still works when
 *                                somebody opens their email on their phone
 *                                after signing up on a laptop — which is
 *                                most people, most of the time.
 *
 * `next` says where to land afterwards. It is deliberately restricted to a
 * path on this site: an open redirect here would let somebody send a
 * convincing paylance link that ends up somewhere else entirely.
 */

/**
 * Turn the provider's wording into something a promoter can act on.
 *
 * Left alone, the commonest failure here reaches the screen as "PKCE code
 * verifier not found in storage... use @supabase/ssr on both the server and
 * client". That is a note to a developer printed at a customer, and it does
 * not tell them the one thing that would fix it.
 */
function plainly(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("code verifier") || m.includes("code challenge")) {
    return "Open the link on the same device you signed up on, or ask for a new one below.";
  }
  if (m.includes("expired") || m.includes("invalid") || m.includes("already")) {
    return "That link has expired. They work once and last an hour — ask for a new one below.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts just now. Give it a minute and try again.";
  }
  return "We couldn't sign you in with that link. Ask for a new one below.";
}

function safeNext(raw: string | null): string {
  if (!raw) return "/overview";
  // Must be a path on this site. "//evil.com" and "https://evil.com" are
  // both rejected; only a single leading slash counts.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/overview";
  return raw;
}

/**
 * Spend the referral cookie, if there is one.
 *
 * Never allowed to break a sign-in. recordReferral swallows everything it
 * can, and this clears the cookie either way — a code that cannot be
 * attributed on the one occasion it could be is not worth carrying around
 * for another ninety days, and leaving it would mean retrying a doomed
 * lookup on every subsequent login.
 */
async function attributeReferral(response: NextResponse) {
  try {
    const store = await cookies();
    const code = store.get(REFERRAL_COOKIE)?.value ?? null;
    if (!code) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) await recordReferral(user.id, code);
  } catch (error) {
    console.error("Referral attribution failed", error);
  } finally {
    response.cookies.delete(REFERRAL_COOKIE);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Supabase reports its own failures here (an expired link, mostly).
  const providerError =
    searchParams.get("error_description") || searchParams.get("error");

  if (!providerError && (code || (tokenHash && type))) {
    const supabase = createClient();

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });

    if (!error) {
      // A recovery link means they are here to set a new password, and they
      // are now signed in well enough to do it.
      const destination = type === "recovery" ? "/reset-password" : next;
      const response = NextResponse.redirect(`${origin}${destination}`);

      // Now there is finally an account to attribute the referral to.
      // Deliberately skipped on a recovery link: somebody resetting their
      // password is not a new organiser, and crediting a referral there
      // would pay out for an account that already existed.
      if (type !== "recovery") {
        await attributeReferral(response);
      }

      return response;
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(plainly(error.message))}`
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      providerError
        ? plainly(providerError)
        : "That link is no longer valid. Ask for a new one below."
    )}`
  );
}
