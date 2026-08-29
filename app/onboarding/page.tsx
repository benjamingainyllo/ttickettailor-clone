"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { checkHandle, normalizeHandle } from "@/lib/handle";
import { SetPasswordGate } from "@/components/auth/set-password-gate";
import { COUNTRIES } from "@/lib/locale";
import { useHost } from "@/lib/use-origin";
import { Check, ImagePlus, Loader2, Lock, Ticket } from "lucide-react";

/**
 * Screen two: creating the box office.
 *
 * Replaces a five-step profile wizard from the creator-products product,
 * which asked for a handle, then a category chosen from Designer / Developer
 * / Photographer, then a location, then a bio. A promoter putting on a club
 * night has no use for any of it.
 *
 * Billing currency is shown but locked. Every amount in this product is an
 * integer number of kobo and every fee band is set in naira; a dropdown
 * offering dollars would be a control that quietly does nothing. Showing it
 * fixed is the honest version of the same row.
 *
 * Bank details are deliberately absent. They are needed to publish a paid
 * event, not to open an account, and the publish gate already refuses
 * without them.
 */

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();

  const [orgName, setOrgName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [country, setCountry] = useState("Nigeria");
  const [mix, setMix] = useState<"free" | "paid" | "">("");
  const [agreed, setAgreed] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // A magic-link signup leaves the account with no password. Until one is set
  // the organiser has no way back in, so that screen comes before this one.
  const [passwordDone, setPasswordDone] = useState(false);
  const needsPassword =
    !passwordDone &&
    !!user &&
    !user.user_metadata?.password_set &&
    user.app_metadata?.provider === "email";

  /**
   * Somebody who has already done this doesn't get asked again.
   *
   * The sign-in button sends everyone here, because it can't know from the
   * browser whether this is a first visit. Without this an organiser who
   * signs in with Google every Friday lands on "create your box office"
   * every Friday, and has to re-tick the policy box to get past it.
   *
   * `done` guards the success screen, which sets a box office name a moment
   * before this would fire.
   */
  useEffect(() => {
    if (done || saving) return;
    if (profile?.box_office_name && profile?.handle) {
      router.replace("/overview");
    }
  }, [profile, done, saving, router]);

  useEffect(() => {
    if (!profile) return;
    if (profile.box_office_name) setOrgName(profile.box_office_name);
    if (profile.handle) {
      setHandle(profile.handle);
      setHandleEdited(true);
    }
    if (profile.country) setCountry(profile.country);
    if (profile.avatar_url) setLogo(profile.avatar_url);
  }, [profile]);

  // The link writes itself from the name, and stops the moment it is edited.
  useEffect(() => {
    if (!handleEdited) setHandle(normalizeHandle(orgName));
  }, [orgName, handleEdited]);

  const origin = useHost();

  const check = useMemo(() => checkHandle(handle), [handle]);
  const canSave =
    orgName.trim().length > 0 && check.ok && mix !== "" && agreed && !saving;

  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("That image is over 4MB. Try a smaller one.");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!user || !canSave) return;
    setSaving(true);

    try {
      let avatarUrl = profile?.avatar_url ?? null;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() ?? "png";
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, logoFile, { upsert: true });

        if (uploadError) {
          console.error("Logo upload failed:", uploadError);
          toast.error("Couldn't upload the logo — saved everything else.");
        } else {
          avatarUrl = supabase.storage.from("avatars").getPublicUrl(path)
            .data.publicUrl;
        }
      }

      const row: Record<string, unknown> = {
        box_office_name: orgName.trim(),
        handle: normalizeHandle(handle),
        country,
        ticket_pricing_mix: mix,
        // When, not whether. The useful question later is always the date and
        // which version of the wording was on screen.
        accepted_use_policy_at: new Date().toISOString(),
      };
      if (avatarUrl) row.avatar_url = avatarUrl;

      const { error } = await supabase
        .from("profiles")
        .update(row)
        .eq("id", user.id);

      if (error) {
        // 23505 is the unique violation on handle — somebody has it already.
        if (error.code === "23505") {
          toast.error("That link is taken. Try another.");
          setHandleEdited(true);
          setSaving(false);
          return;
        }
        console.error("Box office creation failed:", error);
        toast.error("Couldn't create your box office. Please try again.");
        setSaving(false);
        return;
      }

      await refreshProfile().catch(() => {});
      setDone(true);
    } catch (err) {
      console.error("Onboarding failed:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (needsPassword) {
    return (
      <SetPasswordGate
        email={user?.email ?? ""}
        onDone={() => setPasswordDone(true)}
      />
    );
  }

  const field =
    "w-full rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-deep)] px-4 py-3.5 text-[15px] text-[var(--on-ground)] placeholder-[var(--on-ground-faint)] outline-none transition-colors focus:border-[var(--coral)]";
  const labelCls =
    "mb-1.5 block text-[12.5px] font-bold text-[var(--on-ground-soft)]";
  const req = <span className="text-[var(--coral)]">*</span>;

  /* ── Done ──────────────────────────────────────────────────────── */
  if (done) {
    return (
      <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-16 font-[family-name:var(--font-bricolage-grotesque)]">
        <div className="w-full max-w-[460px] text-center">
          <span className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint)]">
            <Check className="h-7 w-7 text-[var(--ink)]" strokeWidth={3} />
          </span>
          <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[38px]">
            {orgName.trim()} is open
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              for business.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-[15.5px] leading-relaxed text-[var(--on-ground-soft)]">
            Your box office is live at{" "}
            <span className="font-bold text-[var(--on-ground)]">
              {origin}/{normalizeHandle(handle)}
            </span>
            . It stays empty until you publish something.
          </p>
          <button
            onClick={() => router.push("/events/create")}
            className="mt-9 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--paper)] py-3.5 text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90"
          >
            <Ticket className="h-4 w-4" />
            Create your first event
          </button>
          <button
            onClick={() => router.push("/overview")}
            className="mt-3 w-full rounded-full border border-[var(--hairline-firm)] py-3.5 text-[14.5px] font-bold text-[var(--on-ground-soft)] transition-colors hover:text-[var(--on-ground)]"
          >
            Take me to the dashboard
          </button>
        </div>
      </main>
    );
  }

  /* ── Create box office ─────────────────────────────────────────── */
  return (
    <main className="lp min-h-screen px-6 py-14 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="mx-auto w-full max-w-[460px]">
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--ground-deep)] px-6 py-5">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">
            Your box office is a few steps away
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--on-ground-soft)]">
            Some basics about you and the events you run. All of it can be
            changed later.
          </p>
        </div>

        <div className="mt-7 space-y-5">
          <div>
            <label htmlFor="orgName" className={labelCls}>
              Organisation name {req}
            </label>
            <input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Lagos Nights"
              maxLength={60}
              autoFocus
              required
              className={field}
            />
            <p className="mt-1.5 text-[12.5px] text-[var(--on-ground-faint)]">
              The name buyers see on your tickets and event pages.
            </p>
          </div>

          <div>
            <label htmlFor="handle" className={labelCls}>Your link {req}</label>
            <div
              className={`flex items-center rounded-xl border bg-[var(--ground-deep)] pl-4 transition-colors ${
                handle.length > 0 && !check.ok
                  ? "border-[var(--coral)]"
                  : "border-[var(--hairline-firm)] focus-within:border-[var(--coral)]"
              }`}
            >
              <span className="shrink-0 text-[15px] text-[var(--on-ground-faint)]">
                {origin}/
              </span>
              <input
                id="handle"
                value={handle}
                onChange={(e) => {
                  setHandleEdited(true);
                  setHandle(normalizeHandle(e.target.value));
                }}
                placeholder="lagosnights"
                className="w-full bg-transparent py-3.5 pr-4 text-[15px] font-semibold text-[var(--on-ground)] outline-none"
              />
            </div>
            {handle.length > 0 && !check.ok && (
              <p className="mt-1.5 text-[13px] font-semibold text-[var(--coral)]">
                {check.reason}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="country" className={labelCls}>Country {req}</label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`${field} appearance-none`}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <span className={labelCls}>Billing currency</span>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--ground-raised)] px-4 py-3.5">
              <Lock className="h-4 w-4 shrink-0 text-[var(--on-ground-faint)]" />
              <span className="text-[15px] text-[var(--on-ground-soft)]">
                Nigerian Naira (₦)
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-[var(--on-ground-faint)]">
              The only currency we settle in today. More will follow.
            </p>
          </div>

          <div>
            <span className={labelCls}>
              Are your tickets mainly free or paid? {req}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["free", "paid"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMix(option)}
                  className={`rounded-xl border py-3.5 text-[14.5px] font-bold capitalize transition-colors ${
                    mix === option
                      ? "border-[var(--coral)] bg-[var(--coral)]/15 text-[var(--on-ground)]"
                      : "border-[var(--hairline-firm)] bg-[var(--ground-deep)] text-[var(--on-ground-soft)] hover:text-[var(--on-ground)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12.5px] text-[var(--on-ground-faint)]">
              Free events never carry a fee. You can run both.
            </p>
          </div>

          <div>
            <span className={labelCls}>
              Logo <span className="font-normal text-[var(--on-ground-faint)]">optional</span>
            </span>
            <label
              htmlFor="logo"
              className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-[var(--hairline-firm)] bg-[var(--ground-deep)] p-3.5 transition-colors hover:border-[var(--coral)]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--ground-raised)]">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-[var(--on-ground-faint)]" />
                )}
              </span>
              <span className="text-[13.5px] text-[var(--on-ground-soft)]">
                {logo ? "Change image" : "Appears on your event pages"}
              </span>
              <input id="logo" type="file" accept="image/*" onChange={pickLogo} className="hidden" />
            </label>
          </div>

          <label className="flex cursor-pointer items-start gap-3 pt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--coral)]"
            />
            <span className="text-[13.5px] leading-relaxed text-[var(--on-ground-soft)]">
              I agree to use this only for events that are lawful, and that I
              have the right to run, as set out in the{" "}
              <Link href="/terms" className="underline hover:text-[var(--on-ground)]">
                terms of service
              </Link>
              . {req}
            </span>
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push("/overview")}
              className="rounded-full border border-[var(--hairline-firm)] px-6 py-3.5 text-[14.5px] font-bold text-[var(--on-ground-soft)] transition-colors hover:text-[var(--on-ground)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canSave}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--mint)] py-3.5 text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create box office"}
            </button>
          </div>

          <p className="pb-4 text-center text-[12.5px] text-[var(--on-ground-faint)]">
            You&apos;ll connect a bank account when you publish your first paid
            event, not now.
          </p>
        </div>
      </div>
    </main>
  );
}
