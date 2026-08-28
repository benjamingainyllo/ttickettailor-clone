"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { checkHandle, normalizeHandle } from "@/lib/handle";
import { toast } from "sonner";
import {
  Camera, Loader2, User, Check, X, Copy, ExternalLink, Lock, Eye, EyeOff, LogOut,
} from "lucide-react";

const CATEGORIES = [
  "Creator", "Educator", "Musician", "Designer", "Writer",
  "Photographer", "Coach", "Developer", "Other",
];

export default function SettingsPage() {
  // The real host this deployment is served from. paylance.me was hardcoded
  // here and does not exist — an organiser copying that link got nowhere.
  const publicHost =
    typeof window !== "undefined" ? window.location.host : "";

  const { user, profile, refreshProfile, signOut } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"profile" | "security">("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name || "");
    setLastName(profile.last_name || "");
    setHandle(profile.handle || "");
    setBio(profile.bio || "");
    setCategory(profile.category || "");
    setLocation(profile.location || "");
    setAvatarUrl(profile.avatar_url || null);
  }, [profile]);

  const handleState = handle ? checkHandle(handle) : { ok: true as const };
  const handleUnchanged = normalizeHandle(handle) === (profile?.handle || "");
  const publicUrl =
    typeof window !== "undefined" && handle ? `${window.location.origin}/${normalizeHandle(handle)}` : "";

  const onPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!user) return;

    if (handle && !handleState.ok) {
      toast.error(handleState.reason!);
      return;
    }

    setSavingProfile(true);

    try {
      let finalAvatarUrl = profile?.avatar_url ?? null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, photoFile, { upsert: true });

        if (uploadError) throw new Error(`Couldn't upload your photo: ${uploadError.message}`);

        // Bust the CDN cache — the path is stable, so the URL must change.
        finalAvatarUrl = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        first_name: firstName || null,
        last_name: lastName || null,
        handle: handle ? normalizeHandle(handle) : null,
        bio: bio || null,
        category: category || null,
        location: location || null,
        avatar_url: finalAvatarUrl,
      });

      if (error) {
        if (error.code === "23505") throw new Error("That handle is already taken. Try another.");
        throw new Error(error.message);
      }

      await refreshProfile();
      setPhotoFile(null);
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save your profile.");
    } finally {
      // Always clears, so the button can never stay stuck spinning.
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Those passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't update your password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-text">Settings</h1>
        <p className="mt-1 text-xs text-subtle">Your public profile and account.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {([
          ["profile", "Profile"],
          ["security", "Security"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              tab === key
                ? "border-blue-500 text-text"
                : "border-transparent text-subtle hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-sm font-bold text-text">Public profile</h2>
            <p className="mt-1 text-xs text-subtle">This is what buyers see on your storefront.</p>

            <div className="mt-6 flex flex-col gap-6 sm:flex-row">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-muted"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Your photo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-subtle">
                      <User className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </button>
                <p className="text-[10px] text-subtle">Click to change</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onPhotoSelect}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" value={firstName} onChange={setFirstName} placeholder="Chidi" />
                  <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Okonkwo" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-subtle">Handle</label>
                  <div className="flex items-center overflow-hidden rounded-lg border border-border bg-muted focus-within:border-blue-500">
                    <span className="shrink-0 border-r border-border px-3 py-2.5 text-xs text-subtle">
                      {publicHost}/
                    </span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(normalizeHandle(e.target.value))}
                      placeholder="yourname"
                      className="h-10 w-full bg-transparent px-3 text-sm text-text placeholder:text-subtle focus:outline-none"
                    />
                    {handle && (
                      <span className="shrink-0 pr-3">
                        {handleState.ok ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </span>
                    )}
                  </div>

                  {handle && !handleState.ok ? (
                    <p className="mt-1.5 text-[11px] text-red-400">{handleState.reason}</p>
                  ) : handle && handleState.ok && handleUnchanged ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(publicUrl);
                          toast.success("Link copied");
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] text-subtle hover:text-text"
                      >
                        <Copy className="h-3 w-3" /> Copy your link
                      </button>
                      <a
                        href={`/${normalizeHandle(handle)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-blue-500 hover:underline"
                      >
                        View storefront <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-subtle">
                      Letters, numbers, hyphens and underscores. Save to claim it.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-subtle">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    rows={3}
                    placeholder="A line about what you make."
                    className="w-full resize-none rounded-lg border border-border bg-muted p-3 text-sm text-text placeholder:text-subtle focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-1 text-right text-[10px] text-subtle">{bio.length}/200</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-subtle">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-text focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Choose one</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c.toLowerCase()}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Field label="Location" value={location} onChange={setLocation} placeholder="Lagos" />
                </div>

                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="flex h-10 items-center justify-center rounded-lg bg-white px-6 text-xs font-bold text-black transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Lock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text">Change password</h2>
                <p className="text-xs text-subtle">At least 8 characters.</p>
              </div>
            </div>

            <div className="mt-6 max-w-sm space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-subtle">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-muted px-3 pr-10 text-sm text-text focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-text"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-subtle">Confirm password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-text focus:border-blue-500 focus:outline-none"
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="mt-1.5 text-[11px] text-red-400">These don&apos;t match.</p>
                )}
              </div>

              <button
                onClick={savePassword}
                disabled={savingPassword}
                className="flex h-10 items-center justify-center rounded-lg bg-white px-6 text-xs font-bold text-black disabled:opacity-60"
              >
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-sm font-bold text-text">Account</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-subtle">Email</dt>
                <dd className="font-medium text-text">{user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-subtle">Joined</dt>
                <dd className="font-medium text-text">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>

            <button
              onClick={() => signOut()}
              className="mt-6 flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-5 text-xs font-semibold text-text transition-colors hover:bg-muted/70"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-subtle">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-text placeholder:text-subtle focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}
