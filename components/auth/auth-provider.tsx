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

  const fetchProfile = async (userId: string, stillWanted = () => true) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data && !error && stillWanted()) {
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

  /**
   * NOTHING IN THE onAuthStateChange CALLBACK MAY AWAIT A SUPABASE CALL.
   *
   * This is not a style preference. It hung the "Get started" button on the
   * signup screen forever, and the mechanism is worth writing down because
   * the code that causes it looks completely reasonable.
   *
   * supabase-js guards its session with a lock. updateUser() takes that
   * lock, and while still holding it, awaits every onAuthStateChange
   * listener. This callback used to await a profile query. A query needs an
   * access token, so it asks for the session — which wants the same lock.
   *
   * That re-entrant request does not fail: it is queued, and the lock holder
   * refuses to finish until the queue drains. So updateUser waits on the
   * listener, the listener waits on the query, and the query waits on
   * updateUser. Nothing times out, because only a first acquisition gets the
   * five-second timeout and this one never reaches it. The button just spins.
   *
   * So: the callback below is synchronous and touches nothing but React
   * state. Loading the profile happens in its own effect, after the lock has
   * been released.
   */
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      })
      .catch((e) => console.error("Failed to get session:", e))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The profile follows whoever is signed in, one step behind and safely
  // outside the lock above.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    fetchProfile(userId, () => mounted);
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
