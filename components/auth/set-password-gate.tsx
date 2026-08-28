"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2 } from "lucide-react";

/**
 * The first thing a new organiser sees after clicking the link in their email.
 *
 * Signing up takes an email address and nothing else, which means the account
 * that arrives here has no password on it. Without this screen that organiser
 * could never sign in again — the sign-in form asks for a password they were
 * never given the chance to set. So this is not an optional polish step; it
 * is the second half of signing up.
 *
 * It is skipped for anyone who already has a password: people arriving through
 * Google, and anyone who has been through here once already.
 */
export function SetPasswordGate({
  email,
  onDone,
}: {
  email: string;
  onDone: () => void;
}) {
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const checks = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const ready =
    firstName.trim().length > 0 && checks.length && checks.letter && checks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);

    // password_set is our own flag. Supabase does not expose "has a password"
    // on the user object, and guessing from the provider list gets it wrong
    // for anyone who has linked more than one way of signing in.
    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password_set: true,
      },
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // Keep the profile row in step. A trigger creates it at signup, so this
    // fills in the name rather than inserting.
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        .eq("id", userData.user.id);
    }

    onDone();
  };

  const field =
    "w-full rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-deep)] px-4 py-3.5 text-[15px] text-[var(--on-ground)] placeholder-[var(--on-ground-faint)] outline-none transition-colors focus:border-[var(--coral)]";
  const labelCls =
    "mb-1.5 block text-[12.5px] font-bold text-[var(--on-ground-soft)]";

  return (
    <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-14 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="w-full max-w-[420px]">
        <span className="mx-auto mb-7 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mint)]">
          <Check className="h-6 w-6 text-[var(--ink)]" strokeWidth={3} />
        </span>

        <h1 className="text-center text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-[34px]">
          Email confirmed
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
          Two things and you&apos;re in. Your password is what you&apos;ll use
          to sign in from now on.
        </p>
        <p className="mt-2 text-center text-[13px] text-[var(--on-ground-faint)]">
          {email}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className={labelCls}>First name</label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Amara"
                autoComplete="given-name"
                autoFocus
                required
                className={field}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelCls}>
                Last name{" "}
                <span className="font-normal text-[var(--on-ground-faint)]">
                  optional
                </span>
              </label>
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

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="newPassword" className={labelCls}>
                Create a password
              </label>
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
            disabled={!ready || saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper)] text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
