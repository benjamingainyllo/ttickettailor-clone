"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";

/**
 * Sign in and sign up.
 *
 * The two halves work differently on purpose.
 *
 * SIGNING UP asks for an email address and nothing else. Everything a new
 * organiser would otherwise type into a form — their name, a password — is
 * asked for after they click the link in their email, by which point the
 * address is already proven and they have committed. Asking for five fields
 * from somebody who has not yet decided is how you lose them at the door.
 *
 * SIGNING IN stays email and password, because somebody coming back wants
 * to be in immediately, not waiting on an inbox.
 *
 * The consequence of that split: a magic-link signup creates an account
 * with NO PASSWORD, so the first thing onboarding does is take one. Skip
 * that and a new organiser can never sign in again. See SetPasswordGate.
 *
 * Which is exactly what happened, so this screen now carries the two ways
 * back that it was missing. "Email me a sign-in link" gets somebody into an
 * account that never got as far as a password — without it that account is
 * simply lost. "Forgot password" covers the ordinary case. Every link goes
 * to /auth/callback, which is the only place a session actually gets made.
 *
 * Nothing on this screen claims anything about how the business is doing.
 * A previous version carried an invented creator count, naira total and a
 * named testimonial, none of which had ever been true. If a number appears
 * here again it has to be one we can point at in the database.
 */

const RESEND_COOLDOWN_SECONDS = 45;

/** Which of the three emails went out. */
type SentKind = "signup" | "link" | "reset";

const SENT_COPY: Record<SentKind, { title: string; body: string }> = {
  signup: {
    title: "Thanks for signing up to sell tickets!",
    body: "to continue setting up your account",
  },
  link: {
    title: "Your sign-in link is on its way",
    body: "with a link that signs you straight in",
  },
  reset: {
    title: "Check your email to reset your password",
    body: "with a link to choose a new password",
  },
};

export function AuthScreen() {
  const router = useRouter();
  const supabase = createClient();
  const params = useSearchParams();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /** Set once a link is away; also the address we sent it to. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  /** Which link went out, because the three say different things. */
  const [sentKind, setSentKind] = useState<SentKind>("signup");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // /auth/callback sends failures back here rather than showing a bare
  // error page — an expired link is the common one, and the fix for it is
  // on this screen.
  const failure = params.get("error");
  useEffect(() => {
    if (failure) toast.error(failure);
  }, [failure]);

  // The provider rate-limits how often it will send. Counting down is
  // honest about the wait instead of letting them press a button that
  // silently fails.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  /**
   * One send for all three link emails.
   *
   * `shouldCreateUser` is the whole difference between signing up and
   * signing in. On the sign-in side it stays false on purpose: typing a
   * typo'd address should say "no account here", not quietly open a second
   * empty account under the typo.
   */
  const sendLink = useCallback(
    async (address: string, kind: SentKind) => {
      const origin = window.location.origin;

      if (kind === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        });
        return error;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: kind === "signup",
          emailRedirectTo: `${origin}/auth/callback?next=${
            kind === "signup" ? "/onboarding" : "/overview"
          }`,
        },
      });
      return error;
    },
    [supabase]
  );

  /** Send, then show the "check your email" screen. */
  const startLink = async (kind: SentKind) => {
    const address = email.trim();
    if (!emailLooksValid) {
      toast.error("Enter your email address first.");
      return;
    }
    setIsLoading(true);
    const error = await sendLink(address, kind);
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSentTo(address);
    setSentKind(kind);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          toast.error(error.message);
          setIsLoading(false);
          return;
        }
        router.push("/overview");
        router.refresh();
        return;
      }

      setIsLoading(false);
      await startLink("signup");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!sentTo || cooldown > 0 || resending) return;
    setResending(true);
    const error = await sendLink(sentTo, sentKind);
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
    toast.success("Sent again. Give it a minute.");
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (error) toast.error(error.message);
  };

  const swap = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setSentTo(null);
    setPassword("");
  };

  const field =
    "w-full rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-deep)] px-4 py-3.5 text-[15px] text-[var(--on-ground)] placeholder-[var(--on-ground-faint)] outline-none transition-colors focus:border-[var(--coral)]";
  const labelCls =
    "mb-1.5 block text-[12.5px] font-bold text-[var(--on-ground-soft)]";

  /* ── Link sent ─────────────────────────────────────────────────── */
  if (sentTo) {
    return (
      <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-16 font-[family-name:var(--font-bricolage-grotesque)]">
        <div className="w-full max-w-[480px] text-center">
          <span className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint)]">
            <Check className="h-7 w-7 text-[var(--ink)]" strokeWidth={3} />
          </span>

          <h1 className="text-[34px] font-extrabold leading-[1.04] tracking-[-0.02em] sm:text-[40px]">
            {SENT_COPY[sentKind].title}
          </h1>

          <p className="mx-auto mt-5 max-w-sm text-[16px] leading-relaxed text-[var(--on-ground-soft)]">
            We&apos;ve sent an email to{" "}
            <span className="font-bold text-[var(--on-ground)]">{sentTo}</span>{" "}
            {SENT_COPY[sentKind].body}.
          </p>

          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="mt-9 flex h-14 w-full items-center justify-center rounded-full bg-[var(--paper)] text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-45"
          >
            {resending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : cooldown > 0 ? (
              `Didn't receive the email? (${cooldown}s)`
            ) : (
              "Didn't receive the email?"
            )}
          </button>

          <p className="mx-auto mt-5 max-w-sm text-[13.5px] leading-relaxed text-[var(--on-ground-faint)]">
            Check your spam folder first — the first one from us often lands
            there. The link works once and expires after an hour.
          </p>

          <button
            onClick={() => swap(true)}
            className="mt-8 text-[13.5px] font-bold text-[var(--coral)] hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  /* ── The form ──────────────────────────────────────────────────── */
  return (
    <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-14 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-9 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 rotate-[-4deg] items-center justify-center rounded-lg border-2 border-[var(--ink)] bg-[var(--coral)] text-[13px] font-black text-white">
            P
          </span>
          <span className="text-[17px] font-extrabold tracking-tight">Paylance</span>
        </Link>

        <h1 className="text-center text-[32px] font-extrabold leading-[1.06] tracking-tight sm:text-[36px]">
          {isLogin ? (
            "Welcome back"
          ) : (
            <>
              Start selling
              <br />
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
                tonight.
              </span>
            </>
          )}
        </h1>
        <p className="mt-3 text-center text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
          {isLogin
            ? "Sign in to your events and your door."
            : "Your email is all we need to start. Free to open."}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-deep)] text-[14.5px] font-bold text-[var(--on-ground)] transition-colors hover:bg-[var(--ground-raised)]"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-[var(--hairline)]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-ground-faint)]">
            or
          </span>
          <span className="h-px flex-1 bg-[var(--hairline)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelCls}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus={!isLogin}
              required
              className={field}
            />
          </div>

          {isLogin && (
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className={labelCls}>Password</label>
                <div className="mb-1.5 flex items-baseline gap-3.5">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[12.5px] font-bold text-[var(--on-ground-faint)] hover:text-[var(--on-ground)]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startLink("reset")}
                    className="text-[12.5px] font-bold text-[var(--coral)] hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
                className={field}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              !emailLooksValid ||
              (isLogin && password.length === 0)
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper)] text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isLogin ? "Sign in" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {!isLogin && (
          <p className="mt-4 text-center text-[13px] leading-relaxed text-[var(--on-ground-faint)]">
            No password to think up yet — we&apos;ll email you a link to
            continue.
          </p>
        )}

        {/*
          The way back in for an account that never got as far as a password.
          Signing up takes only an email, so an organiser who closed the tab
          during setup has a real, confirmed account and nothing to type in
          the box above. Without this they are locked out permanently.
        */}
        {isLogin && (
          <button
            type="button"
            onClick={() => startLink("link")}
            disabled={isLoading}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--hairline-firm)] text-[14px] font-bold text-[var(--on-ground-soft)] transition-colors hover:bg-[var(--ground-deep)] hover:text-[var(--on-ground)] disabled:opacity-40"
          >
            <Mail className="h-4 w-4" />
            Email me a sign-in link instead
          </button>
        )}

        <p className="mt-6 text-center text-[14px] text-[var(--on-ground-soft)]">
          {isLogin ? "New here? " : "Already have an account? "}
          <button
            onClick={() => swap(!isLogin)}
            className="font-bold text-[var(--coral)] hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>

        {!isLogin && (
          <p className="mt-6 text-center text-[12px] leading-relaxed text-[var(--on-ground-faint)]">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="underline hover:text-[var(--on-ground-soft)]">
              terms of service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-[var(--on-ground-soft)]">
              privacy policy
            </Link>
            .
          </p>
        )}

        {/* Three facts about the product, all of them checkable. */}
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[var(--hairline)] pt-6">
          {["Free to open", "From ₦200 a ticket", "Money to your own bank"].map((f) => (
            <li
              key={f}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--on-ground-faint)]"
            >
              <Check className="h-3.5 w-3.5 text-[var(--mint)]" strokeWidth={3} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
