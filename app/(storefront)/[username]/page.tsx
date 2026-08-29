"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { useAuth } from "@/components/auth/auth-provider";
import { 
  Share2, 
  MoreHorizontal, 
  ExternalLink, 
  Zap, 
  Heart,
  MessageCircle,
  ShoppingBag,
  Calendar,
  Globe,
  Instagram,
  Twitter,
  Youtube,
  ChevronRight,
  MapPin,
  User,
  Loader2
} from "lucide-react";

interface CreatorProfile {
  id: string;
  handle: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  category: string | null;
  location: string | null;
  avatar_url: string | null;
}


interface StorefrontEvent {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  cover_image_url: string | null;
  price_kobo: number;
  status: string | null;
}

export default function StorefrontPage() {
  const params = useParams();
  const username = params?.username as string;
  const { user, profile: currentUserProfile } = useAuth();
  const supabase = createClient();

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [events, setEvents] = useState<StorefrontEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "links">("events");

  useEffect(() => {
    if (!username) return;

    const fetchCreator = async () => {
      setLoading(true);

      // Fetch creator profile by handle
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("handle", username)
        .single();

      if (error || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCreator(profileData as CreatorProfile);

      // Check if this is the owner viewing their own profile
      if (user && user.id === profileData.id) {
        setIsOwner(true);
      }

      // Fetch upcoming events for this creator
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", profileData.id)
        .eq("publish_status", "published")
        .order("date", { ascending: true });

      if (eventsData) {
        setEvents(eventsData as StorefrontEvent[]);
      }

      setLoading(false);
    };

    fetchCreator();
  }, [username, user]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="h-20 w-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
          <User className="h-10 w-10 text-zinc-700" />
        </div>
        <h1 className="text-xl font-bold">Creator not found</h1>
        <p className="text-sm text-zinc-500">No creator with the handle @{username} exists.</p>
        <a href="/" className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors">
          Go to Paylance
        </a>
      </main>
    );
  }

  const displayName = [creator?.first_name, creator?.last_name].filter(Boolean).join(" ") || "Creator";
  const categoryLabel = creator?.category ? creator.category.charAt(0).toUpperCase() + creator.category.slice(1) : "";

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Dashboard Link for Owner */}
      {isOwner && (
        <div className="sticky top-0 z-50 flex justify-center pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <button 
            onClick={() => window.location.href = "/overview"}
            className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/20 px-6 py-2.5 text-xs font-bold text-blue-400 backdrop-blur-xl transition-all hover:bg-blue-600/30 active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            Manage Dashboard
          </button>
        </div>
      )}

      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div className="absolute top-[20%] -left-[10%] h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[100px]"></div>
      </div>

      <div className="relative mx-auto max-w-md px-4 pb-20 pt-12">
        {/* Header Actions */}
        <div className="mb-8 flex items-center justify-between">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/50 border border-zinc-800 backdrop-blur-md transition-all hover:bg-zinc-800">
            <Share2 className="h-4 w-4 text-zinc-300" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/50 border border-zinc-800 backdrop-blur-md transition-all hover:bg-zinc-800">
            <MoreHorizontal className="h-4 w-4 text-zinc-300" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-28 w-28">
            <div className="absolute inset-0 animate-pulse rounded-full bg-blue-600/20 blur-xl"></div>
            <div className="relative h-full w-full rounded-full border-2 border-zinc-800 bg-zinc-900 p-1 overflow-hidden">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} alt={displayName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-zinc-600">
                  <User className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-blue-600">
              <Zap className="h-4 w-4 fill-current text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-blue-500">
            <span>@{username}</span>
            {categoryLabel && <span>• {categoryLabel}</span>}
          </div>
          
          {creator?.location && (
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-zinc-500">
              <MapPin className="h-3 w-3" />
              {creator.location}
            </div>
          )}

          <p className="mt-4 px-4 text-sm leading-relaxed text-zinc-400">
            {creator?.bio || "No bio yet. This creator is still setting up their space."}
          </p>

          {/* Social Links Placeholder */}
          <div className="mt-6 flex items-center justify-center gap-4 text-zinc-600">
            <Globe className="h-5 w-5 transition-colors hover:text-white cursor-pointer" />
            <Instagram className="h-5 w-5 transition-colors hover:text-white cursor-pointer" />
            <Twitter className="h-5 w-5 transition-colors hover:text-white cursor-pointer" />
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-3">
            <button className="flex-1 rounded-2xl bg-white h-12 text-sm font-bold text-black shadow-lg transition-all hover:bg-zinc-200 active:scale-[0.98]">
              Follow
            </button>
            <button className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md h-12 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98]">
              Tip Creator
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-around border-b border-zinc-800/50 pb-4">
            <button 
              onClick={() => setActiveTab("events")}
              className={`text-sm font-medium pb-4 px-4 -mb-[18px] transition-colors ${
                activeTab === "events" 
                  ? "text-white border-b-2 border-blue-500" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Events
            </button>
            <button 
              onClick={() => setActiveTab("links")}
              className={`text-sm font-medium pb-4 px-4 -mb-[18px] transition-colors ${
                activeTab === "links" 
                  ? "text-white border-b-2 border-blue-500" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Links
            </button>
          </div>

          {/* Events Tab */}
          {activeTab === "events" && (
            <>
              {events.length > 0 ? (
                <div className="space-y-4 pt-4">
                  {events.map((event) => (
                    <a
                      key={event.id}
                      href={`/event/${event.id}`}
                      className="block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-800/50 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        {event.cover_image_url ? (
                          <img
                            src={event.cover_image_url}
                            alt={event.title}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-zinc-800">
                            <Calendar className="h-6 w-6 text-blue-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{event.title}</h3>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                            {event.date ? new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Date TBD"}
                            {event.time ? ` • ${event.time}` : ""}
                            {event.location ? ` • ${event.location}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-emerald-400">
                            {Number(event.price_kobo ?? 0) === 0 ? "FREE" : formatKobo(Number(event.price_kobo))}
                          </p>
                          <ChevronRight className="h-4 w-4 text-zinc-600 ml-auto mt-1" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="pt-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-700">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-300">No upcoming events</h3>
                  <p className="mt-1 text-xs text-zinc-600">Check back later for events from this creator.</p>
                </div>
              )}
            </>
          )}

          {/* Links Tab */}
          {activeTab === "links" && (
            <div className="pt-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-700">
                <ExternalLink className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-300">No links added</h3>
              <p className="mt-1 text-xs text-zinc-600">This creator hasn&apos;t added any links yet.</p>
            </div>
          )}
        </div>

        {/* Footer Brand */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-30 transition-opacity hover:opacity-100">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 fill-current text-blue-500" />
            <span className="text-xs font-bold tracking-widest text-white">PAYLANCE</span>
          </div>
          <p className="text-[10px] uppercase tracking-tighter text-zinc-500">Built with Creator OS</p>
        </div>
      </div>
    </main>
  );
}
