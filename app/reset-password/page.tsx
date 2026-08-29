"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

/**
 * Choosing a new password after a reset link.
 *
 * By the time anybody gets here /auth/callback has already traded the link
 * for a session, so this screen only has to take the new password. The
 * session is a real one — which is why the link is single-use and short-lived,
 * and why we send people straight through rather than leaving them signed in
 * on a page that just says "done".
 *
 * The same rules as the signup screen, deliberately: two screens disagreeing
 * about what a valid password is, is how you get somebody stuck in a loop.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  // Landing here without a session means the link expired or was already
  // used. Say so plainly instead of failing on submit.
  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!live) return;
      setAllowed(!!data.user);
      setChecking(false);
    });
    return () => {
      live = false;
    };
  }, [supabase]);

  const checks = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const ready = checks.length && checks.letter && checks.number;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
      // Same flag the signup gate sets, so onboarding stops asking.
      data: { password_set: true },
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Password changed. You're signed in.");
    router.push("/overview");
    router.refresh();
  };

  const field =
    "w-full rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-deep)] px-4 py-3.5 text-[15px] text-[var(--on-ground)] placeholder-[var(--on-ground-faint)] outline-none transition-colors focus:border-[var(--coral)]";

  return (
    <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-14 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-9 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 rotate-[-4deg] items-center justify-center rounded-lg border-2 border-[var(--ink)] bg-[var(--coral)] text-[13px] font-black text-white">
            P
          </span>
          <span className="text-[17px] font-extrabold tracking-tight">Paylance</span>
        </Link>

        {checking ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--on-ground-faint)]" />
          </div>
        ) : !allowed ? (
          <>
            <h1 className="text-center text-[30px] font-extrabold leading-[1.08] tracking-tight">
              That link has expired
            </h1>
            <p className="mt-3 text-center text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
              Reset links work once and last an hour. Ask for a fresh one and
              it will be in your inbox in a minute.
            </p>
            <Link
              href="/login"
              className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--paper)] text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-center text-[30px] font-extrabold leading-[1.08] tracking-tight">
              Choose a new password
            </h1>
            <p className="mt-3 text-center text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
              You&apos;ll use this to sign in from now on.
            </p>

            <form onSubmit={handleSave} className="mt-8 space-y-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="new-password" className="block text-[12.5px] font-bold text-[var(--on-ground-soft)]">
                    New password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="text-[12.5px] font-bold text-[var(--on-ground-faint)] hover:text-[var(--on-ground)]"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id="new-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  autoFocus
                  required
                  className={field}
                />

                {password.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {(
                      [
                        ["8 characters or more", checks.length],
                        ["A letter", checks.letter],
                        ["A number", checks.number],
                      ] as const
                    ).map(([label, ok]) => (
                      <li
                        key={label}
                        className={`flex items-center gap-2 text-[12.5px] font-semibold ${
                          ok ? "text-[var(--mint)]" : "text-[var(--on-ground-faint)]"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={!ready || saving}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--paper)] text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save and sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
