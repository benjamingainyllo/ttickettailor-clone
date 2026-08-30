"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Calendar as CalendarIcon, MapPin, Users, Search, Ticket, Zap,
  Banknote, Globe, Lock, Loader2,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EventDetailView } from "@/components/dashboard/event-detail-view";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function EventsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [revenueByEvent, setRevenueByEvent] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    setIsLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data ?? []);

      // Revenue comes from paid orders, never from a column on the event.
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("event_id, gross_kobo")
        .eq("creator_id", user.id)
        .eq("item_type", "event")
        .eq("status", "paid");

      if (ordersError) throw ordersError;

      const totals: Record<string, number> = {};
      for (const o of orders ?? []) {
        if (!o.event_id) continue;
        totals[o.event_id] = (totals[o.event_id] ?? 0) + Number(o.gross_kobo || 0);
      }
      setRevenueByEvent(totals);
    } catch (error) {
      console.error("Error fetching events:", error);
      setLoadError("Couldn't load your events.");
      toast.error("Failed to load events");
    } finally {
      // Always resolves, success or failure.
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter(
    (event) =>
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAttendees = events.reduce((sum, e) => sum + (e.attendees_count || 0), 0);
  const totalRevenueKobo = Object.values(revenueByEvent).reduce((a, b) => a + b, 0);
  const liveCount = events.filter((e) => e.publish_status === "published").length;

  const metrics = [
    {
      title: "Event Revenue",
      value: formatKobo(totalRevenueKobo),
      change: events.length > 0 ? "From paid orders" : "No revenue yet",
      // Banknote, not DollarSign: every amount in this product is naira.
      icon: Banknote,
      iconColor: "#9BE3C0",
      iconBgColor: "rgba(155, 227, 192, 0.1)",
    },
    {
      title: "Total Attendees",
      value: totalAttendees.toString(),
      change: events.length > 0 ? "Across all events" : "No sign-ups yet",
      icon: Users,
      iconColor: "#B7C4FF",
      iconBgColor: "rgba(183, 196, 255, 0.1)",
    },
    {
      title: "Avg. Ticket",
      value: totalAttendees > 0 ? formatKobo(Math.floor(totalRevenueKobo / totalAttendees)) : "—",
      change: totalAttendees > 0 ? "Per attendee" : "No sales yet",
      icon: Ticket,
      iconColor: "#DDBBF5",
      iconBgColor: "rgba(221, 187, 245, 0.1)",
    },
    {
      title: "Live",
      value: liveCount.toString(),
      change: `${events.length - liveCount} in draft`,
      icon: Zap,
      iconColor: "#FF6A45",
      iconBgColor: "rgba(255, 106, 69, 0.1)",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">Events</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-subtle" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-muted/50 pl-9 pr-4 text-xs text-text focus:border-[var(--dl-line)] focus:outline-none sm:w-64"
            />
          </div>
          <button
            onClick={() => router.push("/events/create")}
            className="flex h-9 items-center justify-center gap-2 rounded-[3px] bg-[var(--dl-ink)] px-4 text-xs font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      <div className="flex flex-wrap rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-surface py-20">
          <Loader2 className="h-6 w-6 animate-spin text-subtle" />
        </div>
      ) : loadError ? (
        <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-surface py-16 text-center">
          <p className="text-sm text-text">{loadError}</p>
          <button
            onClick={fetchEvents}
            className="mt-4 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-2 text-xs font-medium text-text"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => {
            const isPublished = event.publish_status === "published";
            const priceKobo = Number(event.price_kobo ?? 0);

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="group cursor-pointer overflow-hidden rounded-[3px] border-2 border-[var(--dl-line)] bg-surface transition-all hover:border-[var(--hairline-firm)] hover:shadow-lg hover:shadow-black/20"
              >
                <div className="relative h-40 w-full overflow-hidden bg-muted">
                  {event.cover_image_url ? (
                    <img
                      src={event.cover_image_url}
                      alt={event.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-subtle">
                      <CalendarIcon className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                  <div
                    className={`absolute right-3 top-3 flex items-center gap-1 rounded-[3px] px-3 py-1 text-[10px] font-bold backdrop-blur-md ${
                      isPublished
                        ? "bg-[#9BE3C0e6] text-[var(--ink)]"
                        : "bg-black/60 text-white"
                    }`}
                  >
                    {isPublished ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                    {isPublished ? "Live" : "Draft"}
                  </div>
                  <div
                    className={`absolute bottom-3 left-3 rounded-[3px] px-3 py-1 text-[10px] font-bold shadow-lg ${
                      priceKobo === 0
                        ? "bg-[var(--mint)] text-white"
                        : "bg-[var(--dl-ink)] text-white"
                    }`}
                  >
                    {priceKobo === 0 ? "FREE" : `${formatKobo(priceKobo)} / ticket`}
                  </div>
                </div>

                <div className="p-5">
                  <h2 className="text-base font-bold text-text">{event.title}</h2>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-subtle">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {event.date
                        ? new Date(event.date).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "TBD"}
                      {event.time ? ` • ${event.time}` : ""}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-subtle">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{event.location || "Online"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-subtle">
                      <Users className="h-3.5 w-3.5" />
                      {event.attendees_count || 0} going
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="rounded-[3px] border-2 border-[var(--dl-line)] bg-muted/50 px-4 py-2 text-xs font-medium text-text transition-colors group-hover:bg-muted">
                      View details
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-subtle">Revenue</p>
                      <p className="text-xs font-bold text-[var(--mint)]">
                        {formatKobo(revenueByEvent[event.id] ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => router.push("/events/create")}
            className="flex min-h-[300px] flex-col items-center justify-center rounded-[3px] border-2 border-dashed border-border bg-transparent transition-all hover:border-[var(--hairline-firm)] hover:bg-muted/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[3px] bg-muted text-subtle">
              <Plus className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-medium text-text">Create new event</p>
            <p className="mt-1 px-8 text-center text-xs text-subtle">
              Host a meetup, workshop or party and collect money in one link.
            </p>
          </button>
        </div>
      )}

      {selectedEvent && (
        <EventDetailView
          event={selectedEvent}
          onBack={() => setSelectedEvent(null)}
          onChanged={fetchEvents}
        />
      )}
    </section>
  );
}
