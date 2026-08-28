"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2 } from "lucide-react";

/**
 * Sign in and sign up.
 *
 * Deliberately one narrow column rather than a form beside a marketing
 * panel. Somebody on this page has already decided; a second sales pitch
 * next to the password box only gives them something else to read.
 *
 * The three lines under the form are the only claims made here, and each
 * one is a fact about the product rather than about how well it is doing.
 * A previous version of this screen carried invented traction — a creator
 * count, a naira total and a named testimonial, none of which had ever
 * been true. Nothing on an auth screen is worth that. If a number appears
 * here again it has to be one we can point at in the database.
 */
export function AuthScreen() {
  const router = useRouter();
  const supabase = createClient();

  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordOk =
    passwordChecks.length && passwordChecks.letter && passwordChecks.number;

  const canSubmit = isLogin
    ? email.length > 0 && password.length > 0
    : firstName.trim().length > 0 && email.length > 0 && passwordOk;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          setIsLoading(false);
          return;
        }
        router.push("/overview");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Email confirmation is off, so they are already signed in.
        router.push("/onboarding");
        router.refresh();
      } else {
        // Confirmation is on. Say so on the page rather than in a toast that
        // disappears before it has been read.
        setEmailSent(true);
        setIsLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) toast.error(error.message);
  };

  const swap = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setEmailSent(false);
    setPassword("");
  };

  const field =
    "w-full rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-deep)] px-4 py-3 text-[15px] text-[var(--on-ground)] placeholder-[var(--on-ground-faint)] outline-none transition-colors focus:border-[var(--coral)]";
  const label =
    "mb-1.5 block text-[12.5px] font-bold text-[var(--on-ground-soft)]";

  /* ── Confirmation sent ─────────────────────────────────────────── */
  if (emailSent) {
    return (
      <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-16 font-[family-name:var(--font-bricolage-grotesque)]">
        <div className="w-full max-w-[420px] text-center">
          <span className="mx-auto mb-7 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mint)]">
            <Check className="h-6 w-6 text-[var(--ink)]" strokeWidth={3} />
          </span>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">
            Check your email
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15.5px] leading-relaxed text-[var(--on-ground-soft)]">
            We sent a confirmation link to{" "}
            <span className="font-bold text-[var(--on-ground)]">{email}</span>.
            Click it and you&apos;ll be taken straight to setting up your first
            event.
          </p>
          <p className="mx-auto mt-4 max-w-sm text-[13.5px] leading-relaxed text-[var(--on-ground-faint)]">
            Nothing after a couple of minutes? Check your spam folder — it can
            land there the first time.
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
            : "Free to open. You only pay when a ticket sells."}
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

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className={label}>First name</label>
                <input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Amara"
                  autoComplete="given-name"
                  required
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="lastName" className={label}>Last name</label>
                <input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Okafor"
                  autoComplete="family-name"
                  className={field}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className={label}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className={field}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className={label}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="mb-1.5 text-[12.5px] font-bold text-[var(--on-ground-faint)] hover:text-[var(--on-ground)]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? "Your password" : "At least 8 characters"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              className={field}
            />

            {!isLogin && password.length > 0 && (
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                {[
                  ["8 characters or more", passwordChecks.length],
                  ["A letter", passwordChecks.letter],
                  ["A number", passwordChecks.number],
                ].map(([text, ok]) => (
                  <li
                    key={String(text)}
                    className={`flex items-center gap-1.5 text-[12.5px] ${
                      ok ? "text-[var(--mint)]" : "text-[var(--on-ground-faint)]"
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                    {text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper)] text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isLogin ? "Sign in" : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

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
          {[
            "Free to open",
            "From ₦200 a ticket",
            "Money to your own bank",
          ].map((f) => (
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
