"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Calendar as CalendarIcon, MapPin, Search, Ticket, Loader2,
  Globe, Lock, CheckCircle2, QrCode, Megaphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatTiles } from "@/components/charts/figures";
import { EventDetailView } from "@/components/dashboard/event-detail-view";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { buildDashboardShape, countdown } from "@/lib/dashboard-shape";

/**
 * Events.
 *
 * A CARD'S JOB IS TO ANSWER "HOW IS IT SELLING". The old one showed a
 * date, a place and a revenue figure — none of which tells an organiser
 * whether to worry. Sold against capacity does: 8 of 200 with a week to
 * go is a problem you can still fix, and it was invisible on this page.
 *
 * SOLD COMES FROM ISSUED TICKETS, never from a counter on the event row.
 * A count kept on the event is a number that drifts the first time a
 * webhook is replayed or a refund is processed; the tickets table is the
 * thing that is actually true, because each row is an admission somebody
 * can present at the door.
 *
 * SOONEST FIRST, NOT NEWEST FIRST. The event you need to look at is the
 * one happening next, not the one you happened to create last. Past
 * events fall to the bottom, most recent first, because that is the order
 * you review them in.
 */

interface EventRow {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  price_kobo: number | null;
  cover_image_url: string | null;
  publish_status: string | null;
  capacity: number | null;
  attendees_count: number | null;
  created_at: string;
  [key: string]: unknown;
}

interface EventStats {
  sold: number;
  checkedIn: number;
  grossKobo: number;
  capacity: number | null;
}

type Filter = "upcoming" | "live" | "draft" | "past" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live" },
  { id: "draft", label: "Drafts" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];

function isPast(date: string | null): boolean {
  if (!date) return false;
  const d = new Date(`${date}T23:59:59`);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export default function EventsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [stats, setStats] = useState<Record<string, EventStats>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("upcoming");

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
      const rows = (data ?? []) as EventRow[];
      setEvents(rows);

      // Money comes from paid orders, never from a column on the event.
      const { data: orderRows, error: ordersError } = await supabase
        .from("orders")
        .select("event_id, gross_kobo, net_kobo, quantity, status, paid_at, created_at")
        .eq("creator_id", user.id)
        .eq("item_type", "event")
        .eq("status", "paid");

      if (ordersError) throw ordersError;
      setOrders(orderRows ?? []);

      // Admissions and capacity, both asked for separately and both
      // allowed to come back empty — an organiser whose database predates
      // ticket tiers still gets the page, just without the bars.
      const [{ data: tickets }, { data: tiers }] = await Promise.all([
        supabase.from("tickets").select("event_id, status").eq("creator_id", user.id),
        supabase.from("ticket_types").select("event_id, quantity, sold_count"),
      ]);

      const next: Record<string, EventStats> = {};
      for (const e of rows) {
        next[e.id] = { sold: 0, checkedIn: 0, grossKobo: 0, capacity: e.capacity ?? null };
      }

      for (const o of orderRows ?? []) {
        const s = o.event_id ? next[o.event_id] : undefined;
        if (s) s.grossKobo += Number(o.gross_kobo || 0);
      }

      for (const t of tickets ?? []) {
        const s = t.event_id ? next[t.event_id] : undefined;
        if (!s) continue;
        if (t.status === "void" || t.status === "refunded") continue;
        s.sold += 1;
        if (t.status === "checked_in") s.checkedIn += 1;
      }

      // Capacity is the sum of what the tiers allow, when every tier is
      // limited. One unlimited tier makes the whole event unlimited —
      // adding up the limited ones would invent a ceiling that isn't real.
      const tierTotals: Record<string, { cap: number; unlimited: boolean; sold: number }> = {};
      for (const t of tiers ?? []) {
        const id = t.event_id as string;
        if (!id || !next[id]) continue;
        const row = tierTotals[id] ?? { cap: 0, unlimited: false, sold: 0 };
        if (t.quantity === null || t.quantity === undefined) row.unlimited = true;
        else row.cap += Number(t.quantity);
        row.sold += Number(t.sold_count || 0);
        tierTotals[id] = row;
      }
      for (const [id, row] of Object.entries(tierTotals)) {
        if (!row.unlimited && row.cap > 0) next[id].capacity = row.cap;
        // Tier counters are the fallback for events with no ticket rows —
        // an event sold before tickets were issued still shows a number.
        if (next[id].sold === 0 && row.sold > 0) next[id].sold = row.sold;
      }

      setStats(next);
    } catch (error) {
      console.error("Error fetching events:", error);
      setLoadError("Couldn't load your events.");
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const shape = useMemo(() => buildDashboardShape(orders), [orders]);

  const totals = useMemo(() => {
    const all = Object.values(stats);
    return {
      sold: all.reduce((s, v) => s + v.sold, 0),
      gross: all.reduce((s, v) => s + v.grossKobo, 0),
      live: events.filter((e) => e.publish_status === "published" && !isPast(e.date)).length,
      drafts: events.filter((e) => e.publish_status !== "published").length,
    };
  }, [stats, events]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const matches = events.filter((e) => {
      if (needle) {
        const hit =
          e.title?.toLowerCase().includes(needle) ||
          e.location?.toLowerCase().includes(needle);
        if (!hit) return false;
      }
      const past = isPast(e.date);
      const published = e.publish_status === "published";
      if (filter === "upcoming") return !past;
      if (filter === "live") return published && !past;
      if (filter === "draft") return !published;
      if (filter === "past") return past;
      return true;
    });

    // Soonest first; anything without a date sits after the dated ones
    // rather than pretending to be today. Past events run backwards.
    return matches.sort((a, b) => {
      const pa = isPast(a.date), pb = isPast(b.date);
      if (pa !== pb) return pa ? 1 : -1;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return pa
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });
  }, [events, search, filter]);

  const chip =
    "rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] transition-transform hover:-translate-y-[1px]";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">Events</h1>
          <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">
            {events.length === 0
              ? "Nothing here yet."
              : `${events.length} ${events.length === 1 ? "event" : "events"}, soonest first.`}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-[var(--dl-ink-faint)]" />
            <input
              type="text"
              placeholder="Search events"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-transparent pl-9 pr-3 text-[13px] focus:outline-none sm:w-56"
            />
          </div>
          {/* Ink, not acid. The sidebar's "New event" is already the one
              acid control in the shell, and a second one on the same
              screen means neither is pointing at anything. */}
          <button
            onClick={() => router.push("/events/create")}
            className="flex h-9 items-center justify-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[var(--dl-panel)] transition-transform hover:-translate-y-[1px]"
          >
            <Plus className="h-4 w-4" /> New event
          </button>
        </div>
      </div>

      <StatTiles
        items={[
          {
            label: "Taken",
            value: formatKobo(shape.grossTrend.value),
            trend: shape.grossTrend,
            spark: shape.dailyGross,
            note: "last 30 days",
          },
          {
            label: "Tickets sold",
            value: shape.ticketsTrend.value.toLocaleString("en-NG"),
            trend: shape.ticketsTrend,
            spark: shape.dailyTickets,
            note: "last 30 days",
          },
          {
            label: "All-time tickets",
            value: totals.sold.toLocaleString("en-NG"),
            note: `${formatKobo(totals.gross)} taken`,
          },
          {
            label: "On sale now",
            value: String(totals.live),
            note: totals.drafts > 0 ? `${totals.drafts} in draft` : "nothing in draft",
          },
        ]}
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`${chip} ${filter === f.id ? "bg-[var(--dl-ink)] text-[var(--dl-panel)]" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
        </div>
      ) : loadError ? (
        <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] py-16 text-center">
          <p className="text-[14px]">{loadError}</p>
          <button onClick={fetchEvents} className={`${chip} mt-4`}>Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              stats={stats[event.id] ?? { sold: 0, checkedIn: 0, grossKobo: 0, capacity: event.capacity ?? null }}
              onOpen={() => setSelectedEvent(event)}
              onScanner={() => router.push(`/events/${event.id}/door` as never)}
              onNotify={() => router.push(`/events/${event.id}/message` as never)}
            />
          ))}

          {visible.length === 0 && (
            <div className="rounded-[3px] border-2 border-dashed border-[var(--dl-line)] px-6 py-16 text-center md:col-span-2 xl:col-span-3">
              <p className="text-[15px] font-bold">
                {events.length === 0 ? "No events yet" : "Nothing under this filter"}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-[var(--dl-ink-soft)]">
                {events.length === 0
                  ? "Put up a party, a workshop or a meetup and start selling in one link."
                  : "Try another tab, or clear the search."}
              </p>
            </div>
          )}

          <button
            onClick={() => router.push("/events/create")}
            className="flex min-h-[280px] flex-col items-center justify-center rounded-[3px] border-2 border-dashed border-[var(--dl-line)] transition-colors hover:bg-black/[0.02]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)]">
              <Plus className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[14px] font-bold">Create new event</p>
            <p className="mt-1 max-w-[240px] text-center text-[13px] text-[var(--dl-ink-soft)]">
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

/**
 * One event, and how it is doing.
 *
 * The progress bar is the whole point of the card. It inks solid at 90%
 * and above so "nearly gone" is visible from across the room, and it is
 * always accompanied by the two numbers — a bar with no figures is a
 * decoration, and an organiser deciding whether to promote needs to know
 * whether the gap is 12 seats or 180.
 */
function EventCard({
  event, stats, onOpen, onScanner, onNotify,
}: {
  event: EventRow;
  stats: EventStats;
  onOpen: () => void;
  onScanner: () => void;
  onNotify: () => void;
}) {
  const published = event.publish_status === "published";
  const past = isPast(event.date);
  const priceKobo = Number(event.price_kobo ?? 0);
  const cap = stats.capacity;
  const pct = cap && cap > 0 ? Math.min(100, (stats.sold / cap) * 100) : null;
  const soldOut = pct !== null && stats.sold >= (cap ?? 0);

  const bar =
    pct === null ? "#4257C4" : soldOut ? "#17714A" : pct >= 90 ? "#141018" : "#4257C4";

  return (
    <div className="flex flex-col overflow-hidden rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
      <button onClick={onOpen} className="group block text-left">
        <div className="relative h-36 w-full overflow-hidden border-b-2 border-[var(--dl-line)] bg-black/[0.04]">
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover_image_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-[var(--dl-ink-faint)]" />
            </div>
          )}

          <span
            className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-[2px] border-2 border-[var(--dl-line)] px-2 py-[2px] text-[10.5px] font-extrabold uppercase tracking-[0.06em] ${
              past
                ? "bg-[var(--dl-panel)] text-[var(--dl-ink-soft)]"
                : published
                  ? "bg-[var(--dl-ink)] text-[var(--dl-panel)]"
                  : "bg-[var(--dl-panel)]"
            }`}
          >
            {past ? "Done" : published ? <><Globe className="h-2.5 w-2.5" /> Live</> : <><Lock className="h-2.5 w-2.5" /> Draft</>}
          </span>

          <span className="absolute bottom-3 left-3 rounded-[2px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-2 py-[2px] text-[10.5px] font-extrabold uppercase tracking-[0.06em]">
            {priceKobo === 0 ? "Free" : `${formatKobo(priceKobo)} a ticket`}
          </span>
        </div>

        <div className="p-5 pb-0">
          <h2 className="text-[17px] font-extrabold leading-[1.15] tracking-[-0.02em]">{event.title}</h2>

          <p className="mt-2 text-[13px] text-[var(--dl-ink-soft)]">
            {event.date
              ? new Date(`${event.date}T00:00:00`).toLocaleDateString("en-NG", {
                  weekday: "short", day: "numeric", month: "short",
                })
              : "Date to be announced"}
            {event.time ? ` · ${event.time}` : ""}
            {event.date && <span className="font-bold text-[var(--dl-ink)]"> · {countdown(event.date)}</span>}
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--dl-ink-soft)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location || "Online"}</span>
          </p>
        </div>
      </button>

      <div className="mt-4 px-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13.5px] font-extrabold [font-variant-numeric:tabular-nums]">
            {stats.sold.toLocaleString("en-NG")}
            {cap ? <span className="font-bold text-[var(--dl-ink-soft)]"> of {cap.toLocaleString("en-NG")}</span> : null}
            <span className="ml-1.5 font-bold text-[var(--dl-ink-soft)]">
              {stats.sold === 1 ? "ticket" : "tickets"}
            </span>
          </p>
          <p className="text-[13.5px] font-extrabold [font-variant-numeric:tabular-nums]">
            {formatKobo(stats.grossKobo)}
          </p>
        </div>

        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-[2px] bg-black/[0.055]">
          <div
            className="h-full rounded-[2px]"
            style={{
              // No capacity means no ceiling to be a fraction of, so the
              // bar shows nothing rather than a made-up proportion.
              width: pct === null ? (stats.sold > 0 ? "100%" : "0%") : `${Math.max(pct > 0 ? 2 : 0, pct)}%`,
              background: bar,
              opacity: pct === null ? 0.25 : 1,
            }}
          />
        </div>

        <p className="mt-1.5 text-[12px] text-[var(--dl-ink-soft)]">
          {soldOut
            ? "Sold out."
            : pct !== null
              ? `${Math.round(pct)}% sold · ${((cap ?? 0) - stats.sold).toLocaleString("en-NG")} left`
              : stats.sold > 0
                ? "No limit set on this event."
                : "Nothing sold yet."}
          {past && stats.sold > 0 && (
            <span className="ml-1.5 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {stats.checkedIn} turned up
            </span>
          )}
        </p>
      </div>

      <div className="mt-4 flex border-t-2 border-[var(--dl-line)]">
        <button
          onClick={onOpen}
          className="flex-1 px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.06em] transition-colors hover:bg-black/[0.03]"
        >
          <Ticket className="mr-1.5 inline h-3.5 w-3.5" /> Manage
        </button>
        <button
          onClick={onNotify}
          className="flex-1 border-l-2 border-[var(--dl-line)] px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.06em] transition-colors hover:bg-black/[0.03]"
        >
          <Megaphone className="mr-1.5 inline h-3.5 w-3.5" /> Notify
        </button>
        <button
          onClick={onScanner}
          className="flex-1 border-l-2 border-[var(--dl-line)] px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.06em] transition-colors hover:bg-black/[0.03]"
        >
          <QrCode className="mr-1.5 inline h-3.5 w-3.5" /> Door
        </button>
      </div>
    </div>
  );
}
