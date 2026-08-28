"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { checkHandle, normalizeHandle } from "@/lib/handle";
import { SetPasswordGate } from "@/components/auth/set-password-gate";
import { ArrowRight, Check, ImagePlus, Loader2, Ticket } from "lucide-react";

/**
 * Setting up a new organiser.
 *
 * One screen, one required answer.
 *
 * What replaced this was a five-step profile wizard from the creator-products
 * product: a handle, then a category chosen from Designer / Developer /
 * Photographer, then a location, then a bio. A promoter putting on a club
 * night has no use for any of it, and every screen between signing up and
 * selling a ticket is a screen somebody leaves on.
 *
 * So the only thing asked for is the name of the box office, because that
 * becomes the public link and there is no sensible default for it. A logo is
 * offered on the same screen rather than a step of its own. Everything else
 * the old wizard collected is optional, nullable, and editable in Settings.
 *
 * Bank details are deliberately NOT here. They are needed to publish a paid
 * event, not to open an account, and the publish gate already refuses without
 * them. Asking for somebody's account number before they have seen the product
 * work is how you lose them.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // A magic-link signup leaves the account with no password on it. Until one
  // is set the organiser has no way back in, so this comes before anything.
  const [passwordDone, setPasswordDone] = useState(false);
  const needsPassword =
    !passwordDone &&
    !!user &&
    !user.user_metadata?.password_set &&
    user.app_metadata?.provider === "email";

  // Coming back to a half-finished setup should not start from nothing.
  useEffect(() => {
    if (!profile) return;
    if (profile.handle) {
      setHandle(profile.handle);
      setHandleEdited(true);
    }
    if (profile.avatar_url) setLogo(profile.avatar_url);
  }, [profile]);

  // The link writes itself from the name until the organiser edits it,
  // which is the only moment the handle stops tracking the name.
  useEffect(() => {
    if (!handleEdited) setHandle(normalizeHandle(name));
  }, [name, handleEdited]);

  const origin =
    typeof window !== "undefined" ? window.location.host : "paylance.app";

  const check = useMemo(() => checkHandle(handle), [handle]);
  const canSave = name.trim().length > 0 && check.ok && !saving;

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

  const handleSave = async () => {
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
          // A logo is not worth losing the rest of the setup over.
          console.error("Logo upload failed:", uploadError);
          toast.error("Couldn't upload the logo — saved everything else.");
        } else {
          avatarUrl = supabase.storage.from("avatars").getPublicUrl(path)
            .data.publicUrl;
        }
      }

      const row: Record<string, unknown> = {
        handle: normalizeHandle(handle),
        first_name: name.trim(),
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
        console.error("Profile save failed:", error);
        toast.error("Couldn't save that. Please try again.");
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

  /* ── Done ──────────────────────────────────────────────────────── */
  if (done) {
    return (
      <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-16 font-[family-name:var(--font-bricolage-grotesque)]">
        <div className="w-full max-w-[460px] text-center">
          <span className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint)]">
            <Check className="h-7 w-7 text-[var(--ink)]" strokeWidth={3} />
          </span>

          <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[38px]">
            {name.trim()} is open
            <br />
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              for business.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-sm text-[15.5px] leading-relaxed text-[var(--on-ground-soft)]">
            Your page is live at{" "}
            <span className="font-bold text-[var(--on-ground)]">
              {origin}/{normalizeHandle(handle)}
            </span>
            . It stays empty until you publish something.
          </p>

          <button
            onClick={() => router.push("/events/create")}
            className="mt-9 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper)] py-3.5 text-[15px] font-extrabold text-[var(--ink)] transition-opacity hover:opacity-90"
          >
            <Ticket className="h-4 w-4" />
            Create your first event
          </button>

          <button
            onClick={() => router.push("/overview")}
            className="mt-3 w-full rounded-xl border border-[var(--hairline-firm)] py-3.5 text-[14.5px] font-bold text-[var(--on-ground-soft)] transition-colors hover:text-[var(--on-ground)]"
          >
            Take me to the dashboard
          </button>
        </div>
      </main>
    );
  }

  /* ── Setup ─────────────────────────────────────────────────────── */
  return (
    <main className="lp flex min-h-screen flex-col items-center justify-center px-6 py-14 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="w-full max-w-[460px]">
        <h1 className="text-center text-[32px] font-extrabold leading-[1.06] tracking-tight sm:text-[36px]">
          What&apos;s your box
          <br />
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
            office called?
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-center text-[15px] leading-relaxed text-[var(--on-ground-soft)]">
          The name buyers see on your tickets and your event pages. Your own
          name is fine if you don&apos;t have a brand yet — you can change it
          later.
        </p>

        <div className="mt-9 space-y-5">
          <div>
            <label htmlFor="boxOffice" className="mb-1.5 block text-[12.5px] font-bold text-[var(--on-ground-soft)]">
              Box office name
            </label>
            <input
              id="boxOffice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lagos Nights"
              autoFocus
              maxLength={60}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="handle" className="mb-1.5 block text-[12.5px] font-bold text-[var(--on-ground-soft)]">
              Your link
            </label>
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
            <span className="mb-1.5 block text-[12.5px] font-bold text-[var(--on-ground-soft)]">
              Logo{" "}
              <span className="font-normal text-[var(--on-ground-faint)]">
                optional
              </span>
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
                {logo ? "Change image" : "Add a logo — it appears on your event pages"}
              </span>
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={pickLogo}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={!canSave}
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

          <p className="text-center text-[13px] text-[var(--on-ground-faint)]">
            You&apos;ll connect a bank account when you publish your first paid
            event, not now.
          </p>
        </div>
      </div>
    </main>
  );
}
