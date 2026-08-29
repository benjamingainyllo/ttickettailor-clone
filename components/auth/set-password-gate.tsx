"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { detectTimezone, timezones } from "@/lib/locale";

/**
 * Screen one after the link in the email: the account itself.
 *
 * The address at the top is already proven — it is the one the link was sent
 * to — so it is shown locked rather than as an editable field somebody could
 * change to an address they do not control.
 *
 * This screen exists because signing up takes an email address and nothing
 * else, which leaves the account with no password on it. Without this, a new
 * organiser could never sign in again: the sign-in form asks for a password
 * they were never given the chance to set. It is the second half of signing
 * up, not an optional polish step.
 */

/** Kept short and answerable. A list nobody can find themselves in is noise. */
const REFERRAL_SOURCES = [
  "Instagram",
  "TikTok",
  "X (Twitter)",
  "WhatsApp",
  "Another organiser told me",
  "Google search",
  "At an event",
  "Somewhere else",
];

export function SetPasswordGate({
  email,
  onDone,
}: {
  email: string;
  onDone: () => void;
}) {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [referral, setReferral] = useState("");
  const [optOut, setOptOut] = useState(false);
  const [saving, setSaving] = useState(false);

  // Default to wherever the browser says it is. Almost always right, and it
  // saves an organiser hunting through a list to find their own city.
  const [timezone, setTimezone] = useState(detectTimezone);

  const zones = useMemo(() => timezones(), []);

  const checks = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const ready =
    fullName.trim().length > 0 &&
    checks.length &&
    checks.letter &&
    checks.number &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);

    const parts = fullName.trim().split(/\s+/);
    const first = parts[0];
    const last = parts.slice(1).join(" ");

    // password_set is our own flag. Supabase does not expose "has a password"
    // on the user, and inferring it from the provider list is wrong for
    // anybody who has linked more than one way of signing in.
    const { error } = await supabase.auth.updateUser({
      password,
      data: { first_name: first, last_name: last, password_set: true },
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: first,
          last_name: last || null,
          timezone,
          referral_source: referral || null,
          marketing_opt_out: optOut,
        })
        .eq("id", userData.user.id);

      // The password is set either way, so a failed profile write must not
      // strand them on this screen — the box office step can fill the gaps.
      if (profileError) console.error("Profile update failed:", profileError);
    }

    onDone();
  };

  const field =
    "w-full rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-deep)] px-4 py-3.5 text-[15px] text-[var(--on-ground)] placeholder-[var(--on-ground-faint)] outline-none transition-colors focus:border-[var(--coral)]";
  const labelCls =
    "mb-1.5 block text-[12.5px] font-bold text-[var(--on-ground-soft)]";

  return (
    <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-14 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="w-full max-w-[440px]">
        <h1 className="text-center text-[32px] font-extrabold leading-[1.06] tracking-tight sm:text-[36px]">
          Your email is confirmed.
          <br />
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
            Now the account.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-center text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
          Free to create, and free to get your first event live.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="fullName" className={labelCls}>Full name</label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Amara Okafor"
              autoComplete="name"
              autoFocus
              required
              className={field}
            />
          </div>

          <div>
            <label htmlFor="verifiedEmail" className={labelCls}>
              Email address{" "}
              <span className="font-normal text-[var(--on-ground-faint)]">
                verified — cannot be changed
              </span>
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--ground-raised)] px-4 py-3.5">
              <Lock className="h-4 w-4 shrink-0 text-[var(--on-ground-faint)]" />
              <span id="verifiedEmail" className="truncate text-[15px] text-[var(--on-ground-soft)]">
                {email}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="newPassword" className={labelCls}>Create a password</label>
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="mb-1.5 text-[12.5px] font-bold text-[var(--on-ground-faint)] hover:text-[var(--on-ground)]"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="newPassword"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              className={field}
            />
            {password.length > 0 && (
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                {[
                  ["8 characters or more", checks.length],
                  ["A letter", checks.letter],
                  ["A number", checks.number],
                ].map(([text, ok]) => (
                  <li
                    key={String(text)}
                    className={`text-[12.5px] ${
                      ok ? "font-semibold text-[var(--mint)]" : "text-[var(--on-ground-faint)]"
                    }`}
                  >
                    {ok ? "✓" : "○"} {text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="timezone" className={labelCls}>Timezone</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={`${field} appearance-none`}
            >
              {zones.map((z) => (
                <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[12.5px] text-[var(--on-ground-faint)]">
              Door times on your events are shown in this zone.
            </p>
          </div>

          <div>
            <label htmlFor="referral" className={labelCls}>
              How did you hear about us?{" "}
              <span className="font-normal text-[var(--on-ground-faint)]">optional</span>
            </label>
            <select
              id="referral"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              className={`${field} appearance-none`}
            >
              <option value="">Choose one</option>
              {REFERRAL_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 pt-1">
            <input
              type="checkbox"
              checked={optOut}
              onChange={(e) => setOptOut(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--coral)]"
            />
            <span className="text-[13.5px] leading-relaxed text-[var(--on-ground-soft)]">
              Opt out of emails about product updates, setup advice and news.
              Ticket and payment emails are sent either way.
            </span>
          </label>

          <p className="text-[12.5px] leading-relaxed text-[var(--on-ground-faint)]">
            By clicking Get started I agree to the{" "}
            <Link href="/terms" className="underline hover:text-[var(--on-ground-soft)]">
              terms of service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-[var(--on-ground-soft)]">
              privacy policy
            </Link>
            .
          </p>

          <button
            type="submit"
            disabled={!ready}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[var(--paper)] py-3.5 text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Get started
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
