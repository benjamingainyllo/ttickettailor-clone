"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  handle: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  category: string | null;
  location: string | null;
  avatar_url: string | null;
  /** Set during box office creation. See setup.sql for what each one is for. */
  box_office_name: string | null;
  timezone: string | null;
  country: string | null;
  referral_source: string | null;
  marketing_opt_out: boolean | null;
  ticket_pricing_mix: string | null;
  accepted_use_policy_at: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data && !error) {
        setProfile(data as Profile);
      }
    } catch (e) {
      console.error("Failed to fetch profile:", e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    setUser(null);
    setProfile(null);
    // Clear any legacy localStorage items
    if (typeof window !== "undefined") {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userName");
      localStorage.removeItem("userHandle");
      localStorage.removeItem("userBio");
      localStorage.removeItem("userCategory");
      localStorage.removeItem("userLocation");
      localStorage.removeItem("userPhoto");
    }
    window.location.href = "/";
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (e) {
        console.error("Failed to get session:", e);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
