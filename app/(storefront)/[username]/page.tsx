"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { useAuth } from "@/components/auth/auth-provider";
import { Calendar, ChevronRight, MapPin, User, Loader2 } from "lucide-react";

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

  /* ── The box office's own page ────────────────────────────────────
     Daylight, and considerably shorter than what it replaces.

     Gone, all of it dead: a Follow button and a Tip Creator button with no
     handlers behind them; three social icons that linked nowhere; Share and
     More buttons that did nothing; a "Links" tab whose only state was empty,
     because nothing in the product can add a link; a lightning badge that
     read as verification; and a footer reading "Built with Creator OS" —
     the name of the product this was before, on a page buyers see.

     Tip Creator was the worst of them. Paylance never holds anybody's
     money — that is the whole legal shape of the business — and a tip
     button says the opposite on the most public page there is.
     ─────────────────────────────────────────────────────────────── */
  const panel = "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";

  if (loading) {
    return (
      <main className="dl flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--dl-ink-faint)]" />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="dl flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center font-[family-name:var(--font-bricolage-grotesque)]">
        <span className={`${panel} flex h-16 w-16 items-center justify-center`}>
          <User className="h-7 w-7" strokeWidth={2} />
        </span>
        <h1 className="mt-2 text-[24px] font-extrabold tracking-[-0.03em]">
          Nobody here
        </h1>
        <p className="text-[14.5px] text-[var(--dl-ink-soft)]">
          No box office has taken the name @{username}.
        </p>
        <a
          href="/"
          className="mt-3 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-6 py-3 text-[14px] font-extrabold text-[var(--dl-paper)]"
        >
          Go to Paylance
        </a>
      </main>
    );
  }

  const displayName =
    [creator?.first_name, creator?.last_name].filter(Boolean).join(" ") || "Box office";

  return (
    <main className="dl min-h-screen font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 lg:py-14">
        {isOwner && (
          <a
            href="/overview"
            className="mb-10 inline-block rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em]"
          >
            Back to your dashboard
          </a>
        )}

        <div className="flex flex-wrap items-end gap-5">
          {creator?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatar_url}
              alt=""
              className={`${panel} h-24 w-24 shrink-0 object-cover`}
            />
          ) : (
            <span className={`${panel} flex h-24 w-24 shrink-0 items-center justify-center text-[30px] font-extrabold`}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}

          <div className="min-w-0">
            <h1 className="text-[36px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[44px]">
              {displayName}
            </h1>
            <p className="mt-2 text-[15px] font-bold text-[var(--dl-ink-soft)]">
              @{username}
              {creator?.location && (
                <span className="ml-3 inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {creator.location}
                </span>
              )}
            </p>
          </div>
        </div>

        {creator?.bio && (
          <p className="mt-7 max-w-[62ch] text-[16px] leading-[1.65] text-[var(--dl-ink-soft)]">
            {creator.bio}
          </p>
        )}

        <p className="mt-10 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
          {events.length > 0
            ? `${events.length} ${events.length === 1 ? "event" : "events"} on`
            : "Events"}
        </p>

        {events.length > 0 ? (
          <div className={`${panel} mt-3`}>
            {events.map((event, i) => (
              <a
                key={event.id}
                href={`/event/${event.id}`}
                className={`flex items-center gap-4 p-4 transition-colors hover:bg-[var(--dl-paper)] ${
                  i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""
                }`}
              >
                {event.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.cover_image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)]">
                    <Calendar className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[16px] font-extrabold tracking-[-0.02em]">
                    {event.title}
                  </h3>
                  <p className="mt-1 truncate text-[13px] text-[var(--dl-ink-soft)]">
                    {event.date
                      ? new Date(event.date).toLocaleDateString("en-NG", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })
                      : "Date to be announced"}
                    {event.time ? ` · ${event.time}` : ""}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[14.5px] font-extrabold [font-variant-numeric:tabular-nums]">
                    {Number(event.price_kobo ?? 0) === 0
                      ? "Free"
                      : formatKobo(Number(event.price_kobo))}
                  </p>
                  <ChevronRight className="ml-auto mt-1 h-4 w-4 text-[var(--dl-ink-faint)]" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className={`${panel} mt-3 px-6 py-12 text-center`}>
            <p className="text-[16px] font-extrabold tracking-[-0.02em]">Nothing on sale</p>
            <p className="mx-auto mt-1 max-w-xs text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
              When {displayName} puts an event up, it appears here.
            </p>
          </div>
        )}

        <p className="mt-14 text-center text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
          Tickets by Paylance
        </p>
      </div>
    </main>
  );
}
