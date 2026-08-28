"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { checkHandle, normalizeHandle } from "@/lib/handle";
import { SetPasswordGate } from "@/components/auth/set-password-gate";
import { 
  Sparkles, 
  Rocket, 
  ArrowRight, 
  ChevronRight, 
  UserCircle, 
  Target,
  Palette,
  Code,
  PenTool,
  Camera,
  Music,
  Video,
  MapPin,
  Upload,
  Image as ImageIcon,
  X,
  Zap
} from "lucide-react";

const categories = [
  { id: "design", label: "Designer", icon: Palette },
  { id: "dev", label: "Developer", icon: Code },
  { id: "writing", label: "Writer", icon: PenTool },
  { id: "photo", label: "Photographer", icon: Camera },
  { id: "video", label: "Video Creator", icon: Video },
  { id: "music", label: "Musician", icon: Music },
  { id: "other", label: "Other", icon: Sparkles },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();
  const [step, setStep] = useState(1);

  // Signing up takes an email address and nothing else, so an account can
  // arrive here with no password on it. Until one is set the organiser has
  // no way back in, which makes this the first thing shown — before the
  // handle, before anything. Google accounts already have a provider to
  // sign in with, so they skip it.
  const [passwordDone, setPasswordDone] = useState(false);
  const needsPassword =
    !passwordDone &&
    !!user &&
    !user.user_metadata?.password_set &&
    user.app_metadata?.provider === "email";
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const userName = profile?.first_name || user?.user_metadata?.first_name || "Creator";

  // Pre-fill from existing profile if returning to onboarding
  useEffect(() => {
    if (profile) {
      if (profile.handle) setHandle(profile.handle);
      if (profile.category) setCategory(profile.category);
      if (profile.bio) setBio(profile.bio);
      if (profile.location) setLocation(profile.location);
      if (profile.avatar_url) setPhoto(profile.avatar_url);
    }
  }, [profile]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let avatarUrl = profile?.avatar_url || null;

      // Upload avatar to Supabase Storage if a new file was selected
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split(".").pop();
          const filePath = `${user.id}/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, photoFile, { upsert: true });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("avatars")
              .getPublicUrl(filePath);
            avatarUrl = publicUrlData.publicUrl;
          }
        } catch (e) {
          // Avatar upload failed — continue without it
          console.error("Avatar upload failed:", e);
        }
      }

      // Update profile in Supabase (row already exists from auth trigger)
      const profileData: Record<string, any> = {
        handle: normalizeHandle(handle) || null,
        category: category || null,
        bio: bio || null,
        location: location || null,
      };
      if (avatarUrl) profileData.avatar_url = avatarUrl;

      const { error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", user.id);

      if (error) {
        console.error("Profile update error:", error);
        if (error.code === "23505") {
          toast.error("That handle is already taken. Try a different one!");
          setStep(1);
          setSaving(false);
          return;
        }
        // If update fails, try insert as fallback
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user.id, ...profileData });

        if (insertError) {
          console.error("Profile insert error:", insertError);
          toast.error("Failed to save profile. Please try again.");
          setSaving(false);
          return;
        }
      }

      // Refresh the auth context profile
      try {
        await refreshProfile();
      } catch (e) {
        // Non-blocking
      }

      toast.success("Profile created!");
      setStep(6); // Show success screen
    } catch (err) {
      console.error("Onboarding error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const enterDashboard = () => {
    router.push(`/${normalizeHandle(handle)}`);
  };

  if (needsPassword) {
    return (
      <SetPasswordGate
        email={user?.email ?? ""}
        onDone={() => setPasswordDone(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      <div className="fixed -top-[20%] -left-[10%] h-[60%] w-[60%] rounded-full bg-blue-600/10 blur-[120px]"></div>
      
      <div className="relative mx-auto max-w-2xl px-6 py-20">
        {step < 6 && (
          <header className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs font-medium text-blue-400">
              <Sparkles className="h-3 w-3" /> Step {step} of 5
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome, {userName}! <br />
              <span className="text-zinc-500">Let&apos;s build your profile.</span>
            </h1>
          </header>
        )}

        <div className="space-y-12">
          {/* Step 1: Handle */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-blue-500" />
                  Claim your handle
                </h2>
                <p className="text-sm text-zinc-500">This will be your unique URL on Paylance.</p>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center text-zinc-500 transition-colors group-focus-within:text-blue-500">
                  <span className="text-sm font-medium">paylance.me/</span>
                </div>
                <input 
                  type="text" 
                  value={handle}
                  onChange={(e) => setHandle(normalizeHandle(e.target.value))}
                  placeholder="username"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 pl-[110px] pr-4 text-lg font-medium outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {handle && !checkHandle(handle).ok && (
                <p className="mt-3 text-sm text-red-400">{checkHandle(handle).reason}</p>
              )}
              <button 
                onClick={() => checkHandle(handle).ok && setStep(2)}
                disabled={!checkHandle(handle).ok}
                className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-lg font-bold text-black transition-all hover:bg-zinc-200 disabled:opacity-50"
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Step 2: Category */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  What type of creator are you?
                </h2>
                <p className="text-sm text-zinc-500">We&apos;ll tailor your experience based on your category.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all ${
                      category === cat.id 
                        ? "border-blue-500 bg-blue-500/10 text-white" 
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    <cat.icon className="h-6 w-6" />
                    <span className="text-xs font-semibold uppercase tracking-wider">{cat.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setStep(1)} className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-zinc-800 font-bold">Back</button>
                <button 
                  onClick={() => category && setStep(3)}
                  disabled={!category}
                  className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black disabled:opacity-50"
                >
                  Continue
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Photo Upload */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-500" />
                  Add a profile picture
                </h2>
                <p className="text-sm text-zinc-500">Help your audience recognize you.</p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-6 rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 p-12">
                {photo ? (
                  <div className="relative">
                    <img src={photo} alt="Preview" className="h-32 w-32 rounded-full border-4 border-blue-500/30 object-cover shadow-2xl" />
                    <button onClick={() => { setPhoto(null); setPhotoFile(null); }} className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-white"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-zinc-900 text-zinc-700">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
                <label className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold transition-all hover:bg-blue-500 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setStep(2)} className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-zinc-800 font-bold">Back</button>
                <button onClick={() => setStep(4)} className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black">
                  {photo ? "Continue" : "Skip for now"}
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Location */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  Where are you based?
                </h2>
                <p className="text-sm text-zinc-500">Connect with local creators and fans.</p>
              </div>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 transition-colors group-focus-within:text-blue-500" />
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Lagos, Nigeria"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 pl-12 pr-4 text-lg font-medium outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setStep(3)} className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-zinc-800 font-bold">Back</button>
                <button onClick={() => setStep(5)} className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black">
                  {location ? "Continue" : "Skip for now"}
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Bio */}
          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-blue-500" />
                  Your creator headline
                </h2>
                <p className="text-sm text-zinc-500">How would you describe yourself in one sentence?</p>
              </div>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Building the next generation of designer tools."
                rows={4}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-lg outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <div className="mt-8 flex gap-3">
                <button onClick={() => setStep(4)} className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-zinc-800 font-bold">Back</button>
                <button 
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      {bio ? "Launch Profile" : "Skip & Launch"}
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Success Screen */}
          {step === 6 && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-700">
              <div className="relative mb-8">
                <div className="absolute inset-0 scale-150 bg-blue-500/20 blur-3xl rounded-full"></div>
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 shadow-2xl shadow-blue-600/40">
                  {photo ? <img src={photo} alt="Avatar" className="h-full w-full rounded-full object-cover" /> : <Rocket className="h-10 w-10 text-white" />}
                </div>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">You&apos;re all set!</h1>
              <p className="mt-4 text-lg text-zinc-400 max-w-md mx-auto">Your creator profile has been successfully created. Welcome to the future of monetization.</p>
              <div className="mt-12 w-full space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-left">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {photo ? <img src={photo} alt="Avatar" className="h-full w-full object-cover" /> : <UserCircle className="h-6 w-6 text-blue-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">paylance.me/{handle}</p>
                      <p className="truncate text-xs text-zinc-500">{category.charAt(0).toUpperCase() + category.slice(1)} • {location || "Worldwide"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => router.push("/overview")}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] shadow-lg shadow-blue-600/20"
                  >
                    Go to Dashboard
                    <Zap className="h-5 w-5 fill-current" />
                  </button>
                  <button 
                    onClick={enterDashboard}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-lg font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
                  >
                    View My Profile
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
