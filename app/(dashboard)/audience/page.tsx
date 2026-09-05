"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Download, Loader2, X, Mail, UsersRound, CheckCircle2, QrCode,
} from "lucide-react";
import { StatTiles } from "@/components/charts/figures";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { buildDashboardShape } from "@/lib/dashboard-shape";
import { toast } from "sonner";

/**
 * Attendees.
 *
 * THE UNIT HERE IS AN ADMISSION, NOT AN EMAIL ADDRESS. This page used to
 * list the `audience` table — one row per person who had ever bought
 * something, with a lifetime spend. That answers a marketing question.
 * The question an organiser actually has on the day is "who is coming to
 * Saturday, and have they walked in yet", and no amount of lifetime spend
 * answers it. So the source is now the tickets table: one row per seat,
 * with the tier, the door status and the event it belongs to.
 *
 * PEOPLE AND TICKETS ARE THE SAME DATA, TWO WAYS. One buyer with four
 * tickets is one row on the People tab and four on the Tickets tab, and
 * both are the truth for a different job — chasing a customer versus
 * finding a specific admission. They are built from the same array, so
 * the two tabs cannot disagree.
 *
 * AN UNMIGRATED DATABASE STILL GETS A PAGE. If no tickets exist, the
 * buyer list is assembled from paid orders instead and the page says so,
 * rather than showing an organiser with real sales an empty screen.
 */

interface TicketRow {
  id: string;
  code: string;
  event_id: string | null;
  order_id: string | null;
  ticket_type_name: string | null;
  price_kobo: number | string | null;
  holder_name: string | null;
  holder_email: string | null;
  seat_index: number | null;
  status: string | null;
  checked_in_at: string | null;
  created_at: string;
}

interface Person {
  email: string;
  name: string | null;
  tickets: number;
  checkedIn: number;
  spentKobo: number;
  orders: number;
  lastSeen: string;
  events: Set<string>;
}

type Tab = "people" | "tickets";

export default function AttendeesPage() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [eventNames, setEventNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("people");
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState<string>("all");
  const [doorOnly, setDoorOnly] = useState<"all" | "in" | "out">("all");
  const [shown, setShown] = useState(30);
  const [selected, setSelected] = useState<Person | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    setLoading(true);
    setLoadError(null);

    try {
      const [{ data: tix }, { data: ords, error: ordersError }, { data: evs }] =
        await Promise.all([
          supabase
            .from("tickets")
            .select("id, code, event_id, order_id, ticket_type_name, price_kobo, holder_name, holder_email, seat_index, status, checked_in_at, created_at")
            .eq("creator_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("id, event_id, item_title, buyer_email, buyer_name, quantity, gross_kobo, status, paid_at, created_at")
            .eq("creator_id", user.id)
            .eq("status", "paid")
            .order("created_at", { ascending: false }),
          supabase.from("events").select("id, title").eq("creator_id", user.id),
        ]);

      if (ordersError) throw ordersError;

      setTickets((tix ?? []) as TicketRow[]);
      setOrders(ords ?? []);

      const names: Record<string, string> = {};
      for (const e of evs ?? []) names[e.id as string] = (e.title as string) ?? "Untitled";
      setEventNames(names);
    } catch (error) {
      console.error("Could not load attendees:", error);
      setLoadError("Couldn't load your attendees.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Tickets issued over time, in the same shape every other page uses. */
  const shape = useMemo(
    () =>
      buildDashboardShape(
        tickets
          .filter((t) => t.status !== "void" && t.status !== "refunded")
          .map((t) => ({
            status: "paid",
            quantity: 1,
            gross_kobo: t.price_kobo,
            created_at: t.created_at,
          }))
      ),
    [tickets]
  );

  const live = useMemo(
    () => tickets.filter((t) => t.status !== "void" && t.status !== "refunded"),
    [tickets]
  );

  const checkedInTotal = useMemo(
    () => live.filter((t) => t.status === "checked_in" || t.checked_in_at).length,
    [live]
  );

  /** One row per person, built from tickets — or from orders if there are none. */
  const people = useMemo(() => {
    const map = new Map<string, Person>();

    const touch = (email: string, name: string | null, when: string) => {
      const key = email.toLowerCase();
      const p =
        map.get(key) ??
        ({ email, name, tickets: 0, checkedIn: 0, spentKobo: 0, orders: 0, lastSeen: when, events: new Set<string>() } as Person);
      if (!p.name && name) p.name = name;
      if (when > p.lastSeen) p.lastSeen = when;
      map.set(key, p);
      return p;
    };

    for (const t of live) {
      const email = t.holder_email?.trim();
      if (!email) continue;
      const p = touch(email, t.holder_name, t.created_at);
      p.tickets += 1;
      if (t.status === "checked_in" || t.checked_in_at) p.checkedIn += 1;
      if (t.event_id) p.events.add(t.event_id);
    }

    // Money is an order-level fact — a ticket carries its face price, not
    // what the buyer was actually charged — so spend is always summed
    // from orders even when tickets exist.
    for (const o of orders) {
      const email = o.buyer_email?.trim();
      if (!email) continue;
      const p = touch(email, o.buyer_name, o.paid_at || o.created_at);
      p.spentKobo += Number(o.gross_kobo || 0);
      p.orders += 1;
      if (live.length === 0) {
        // No ticket rows: fall back to what the order says it sold.
        p.tickets += Math.max(1, Math.floor(Number(o.quantity || 0)) || 1);
        if (o.event_id) p.events.add(o.event_id);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [live, orders]);

  const eventOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const t of live) if (t.event_id) ids.add(t.event_id);
    for (const o of orders) if (o.event_id) ids.add(o.event_id);
    return Array.from(ids).map((id) => ({ id, title: eventNames[id] ?? "Untitled event" }));
  }, [live, orders, eventNames]);

  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return live.filter((t) => {
      if (eventId !== "all" && t.event_id !== eventId) return false;
      const isIn = t.status === "checked_in" || !!t.checked_in_at;
      if (doorOnly === "in" && !isIn) return false;
      if (doorOnly === "out" && isIn) return false;
      if (!needle) return true;
      return (
        t.holder_email?.toLowerCase().includes(needle) ||
        t.holder_name?.toLowerCase().includes(needle) ||
        t.code?.toLowerCase().includes(needle) ||
        t.ticket_type_name?.toLowerCase().includes(needle)
      );
    });
  }, [live, search, eventId, doorOnly]);

  const filteredPeople = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return people.filter((p) => {
      if (eventId !== "all" && !p.events.has(eventId)) return false;
      if (doorOnly === "in" && p.checkedIn === 0) return false;
      if (doorOnly === "out" && p.checkedIn === p.tickets && p.tickets > 0) return false;
      if (!needle) return true;
      return (
        p.email.toLowerCase().includes(needle) ||
        p.name?.toLowerCase().includes(needle)
      );
    });
  }, [people, search, eventId, doorOnly]);

  const exportCsv = () => {
    const rows =
      tab === "tickets"
        ? [
            ["Ticket code", "Holder", "Email", "Event", "Type", "Price (NGN)", "Status", "Checked in at", "Issued"],
            ...filteredTickets.map((t) => [
              t.code,
              t.holder_name ?? "",
              t.holder_email ?? "",
              t.event_id ? eventNames[t.event_id] ?? "" : "",
              t.ticket_type_name ?? "",
              (Number(t.price_kobo || 0) / 100).toFixed(2),
              t.status ?? "",
              t.checked_in_at ?? "",
              t.created_at,
            ]),
          ]
        : [
            ["Name", "Email", "Tickets", "Checked in", "Orders", "Spent (NGN)", "Last activity"],
            ...filteredPeople.map((p) => [
              p.name ?? "",
              p.email,
              String(p.tickets),
              String(p.checkedIn),
              String(p.orders),
              (p.spentKobo / 100).toFixed(2),
              p.lastSeen,
            ]),
          ];

    if (rows.length <= 1) return;

    // Every field quoted and internal quotes doubled, so a name with a
    // comma in it doesn't shift the columns.
    const csv = rows
      .map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `paylance-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${tab === "tickets" ? "Tickets" : "Attendees"} exported`);
  };

  const panel = "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";
  const chip =
    "rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] transition-transform hover:-translate-y-[1px]";
  const chipOn = "bg-[var(--dl-ink)] text-[var(--dl-panel)]";

  if (loading) {
    return (
      <section className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">Attendees</h1>
          <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">
            Every ticket you have issued, and everyone holding one.
          </p>
        </div>
        <button onClick={exportCsv} className={`${chip} flex h-9 items-center gap-2`}>
          <Download className="h-3.5 w-3.5" /> Export {tab === "tickets" ? "tickets" : "people"}
        </button>
      </div>

      {loadError && (
        <div className={`${panel} p-5`}>
          <p className="text-[14px]">{loadError}</p>
          <button onClick={load} className={`${chip} mt-3`}>Retry</button>
        </div>
      )}

      <StatTiles
        items={[
          {
            label: "Tickets issued",
            value: shape.ticketsTrend.value.toLocaleString("en-NG"),
            trend: shape.ticketsTrend,
            spark: shape.dailyTickets,
            note: "last 30 days",
            tone: "count",
          },
          {
            label: "All-time tickets",
            value: live.length.toLocaleString("en-NG"),
            note: `${people.length.toLocaleString("en-NG")} ${people.length === 1 ? "person" : "people"}`,
            tone: "count",
          },
          {
            label: "Turned up",
            value: checkedInTotal.toLocaleString("en-NG"),
            note:
              live.length > 0
                ? `${Math.round((checkedInTotal / live.length) * 100)}% of tickets scanned`
                : "nothing scanned yet",
            tone: "money",
          },
          {
            label: "Came back",
            value: people.filter((p) => p.orders > 1).length.toLocaleString("en-NG"),
            note: "bought more than once",
            tone: "group",
          },
        ]}
      />

      {live.length === 0 && orders.length > 0 && (
        <p className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-5 py-4 text-[13.5px] text-[var(--dl-ink-soft)]">
          These sales happened before individual tickets were issued, so
          there is nothing to scan at the door yet — the list below is built
          from the orders themselves.
        </p>
      )}

      {/* Controls: what you are looking at, then which event, then a search. */}
      <div className={`${panel} flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["people", "tickets"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShown(30); }}
              aria-pressed={tab === t}
              className={`${chip} ${tab === t ? chipOn : ""}`}
            >
              {t === "people" ? `People · ${filteredPeople.length}` : `Tickets · ${filteredTickets.length}`}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {([["all", "Everyone"], ["in", "Checked in"], ["out", "Not yet in"]] as const).map(([id, lab]) => (
              <button
                key={id}
                onClick={() => { setDoorOnly(id); setShown(30); }}
                aria-pressed={doorOnly === id}
                className={`${chip} ${doorOnly === id ? chipOn : ""}`}
              >
                {lab}
              </button>
            ))}
          </div>

          {eventOptions.length > 0 && (
            <select
              value={eventId}
              onChange={(e) => { setEventId(e.target.value); setShown(30); }}
              className="h-9 rounded-[3px] border-2 border-[var(--dl-line)] bg-transparent px-2 text-[13px] font-bold focus:outline-none"
            >
              <option value="all">All events</option>
              {eventOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          )}

          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-[var(--dl-ink-faint)]" />
            <input
              type="text"
              placeholder={tab === "tickets" ? "Name, email or ticket code" : "Name or email"}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShown(30); }}
              className="h-9 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-transparent pl-9 pr-3 text-[13px] focus:outline-none sm:w-60"
            />
          </div>
        </div>
      </div>

      <div className={`${panel} overflow-hidden`}>
        {tab === "people" ? (
          filteredPeople.length === 0 ? (
            <Empty
              title={people.length === 0 ? "Nobody yet" : "Nothing matches that"}
              body={
                people.length === 0
                  ? "Everyone who buys a ticket lands here automatically, with what they hold and whether they have walked in."
                  : "Try another filter, or clear the search."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead>
                  <tr className="border-b-2 border-[var(--dl-line)]">
                    <Th>Person</Th>
                    <Th right>Tickets</Th>
                    <Th right>At the door</Th>
                    <Th right>Spent</Th>
                    <Th>Last activity</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.slice(0, shown).map((p) => (
                    <tr
                      key={p.email}
                      onClick={() => setSelected(p)}
                      className="cursor-pointer border-b border-[var(--dl-line-soft)] last:border-b-0 hover:bg-black/[0.02]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} email={p.email} />
                          <div className="min-w-0">
                            <p className="truncate font-bold">{p.name || p.email}</p>
                            {p.name && (
                              <p className="truncate text-[12px] text-[var(--dl-ink-soft)]">{p.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-bold [font-variant-numeric:tabular-nums]">
                        {p.tickets}
                      </td>
                      <td className="px-5 py-3 text-right [font-variant-numeric:tabular-nums]">
                        {p.tickets > 0 && p.checkedIn === p.tickets ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#17714A]">
                            <CheckCircle2 className="h-3.5 w-3.5" /> all in
                          </span>
                        ) : p.checkedIn > 0 ? (
                          <span className="font-bold">{p.checkedIn} of {p.tickets}</span>
                        ) : (
                          <span className="text-[var(--dl-ink-faint)]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-bold [font-variant-numeric:tabular-nums]">
                        {formatKobo(p.spentKobo)}
                      </td>
                      <td className="px-5 py-3 text-[var(--dl-ink-soft)]">{timeAgo(p.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredTickets.length === 0 ? (
          <Empty
            title={live.length === 0 ? "No tickets issued yet" : "Nothing matches that"}
            body={
              live.length === 0
                ? "A ticket is created for every seat as soon as an order is paid. They will be listed here, ready to scan at the door."
                : "Try another filter, or clear the search."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[var(--dl-line)]">
                  <Th>Ticket</Th>
                  <Th>Holder</Th>
                  <Th>Event</Th>
                  <Th right>Face value</Th>
                  <Th>Door</Th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.slice(0, shown).map((t) => {
                  const isIn = t.status === "checked_in" || !!t.checked_in_at;
                  return (
                    <tr key={t.id} className="border-b border-[var(--dl-line-soft)] last:border-b-0">
                      <td className="px-5 py-3">
                        <p className="font-mono text-[13px] font-bold tracking-[0.04em]">{t.code}</p>
                        <p className="text-[12px] text-[var(--dl-ink-soft)]">
                          {t.ticket_type_name || "General admission"}
                          {t.seat_index && t.seat_index > 1 ? ` · seat ${t.seat_index}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-bold">{t.holder_name || t.holder_email || "—"}</p>
                        {t.holder_name && t.holder_email && (
                          <p className="text-[12px] text-[var(--dl-ink-soft)]">{t.holder_email}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <p className="max-w-[200px] truncate">
                          {t.event_id ? eventNames[t.event_id] ?? "—" : "—"}
                        </p>
                        <p className="text-[12px] text-[var(--dl-ink-soft)]">
                          issued {new Date(t.created_at).toLocaleDateString("en-NG", {
                            day: "numeric", month: "short",
                          })}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right font-bold [font-variant-numeric:tabular-nums]">
                        {Number(t.price_kobo || 0) === 0 ? "Free" : formatKobo(Number(t.price_kobo || 0))}
                      </td>
                      <td className="px-5 py-3">
                        {isIn ? (
                          <span className="inline-flex items-center gap-1 rounded-[2px] border-2 border-[#17714A] px-2 py-[1px] text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#17714A]">
                            <CheckCircle2 className="h-3 w-3" /> in
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-[2px] border-2 border-[var(--dl-line)] px-2 py-[1px] text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--dl-ink-soft)]">
                            <QrCode className="h-3 w-3" /> not yet
                          </span>
                        )}
                        {t.checked_in_at && (
                          <p className="mt-1 text-[12px] text-[var(--dl-ink-soft)]">
                            {new Date(t.checked_in_at).toLocaleTimeString("en-NG", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {((tab === "people" ? filteredPeople.length : filteredTickets.length) > shown) && (
          <div className="border-t-2 border-[var(--dl-line)] p-4 text-center">
            <button onClick={() => setShown((n) => n + 50)} className={chip}>
              Show 50 more
            </button>
          </div>
        )}
      </div>

      {selected && (
        <PersonDrawer
          person={selected}
          tickets={live.filter(
            (t) => t.holder_email?.toLowerCase() === selected.email.toLowerCase()
          )}
          eventNames={eventNames}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={`bg-[var(--dl-neutral-wash)] px-5 py-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)] ${right ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)]">
        <UsersRound className="h-6 w-6" />
      </div>
      <p className="text-[15px] font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-[var(--dl-ink-soft)]">{body}</p>
    </div>
  );
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] text-[11.5px] font-extrabold">
      {initials}
    </div>
  );
}

/** Everything one person holds, with no second trip to the database. */
function PersonDrawer({
  person, tickets, eventNames, onClose,
}: {
  person: Person;
  tickets: TicketRow[];
  eventNames: Record<string, string>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto border-l-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={person.name} email={person.email} />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-extrabold tracking-[-0.02em]">
                {person.name || person.email}
              </p>
              <p className="truncate text-[13px] text-[var(--dl-ink-soft)]">{person.email}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 rounded-[3px] border-2 border-[var(--dl-line)]">
          <Cell label="Tickets" value={String(person.tickets)} />
          <Cell label="Checked in" value={String(person.checkedIn)} bordered />
          <Cell label="Spent" value={formatKobo(person.spentKobo)} bordered />
        </div>

        <a
          href={`mailto:${person.email}`}
          className="mt-3 flex h-10 items-center justify-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] text-[12px] font-extrabold uppercase tracking-[0.06em] transition-colors hover:bg-black/[0.03]"
        >
          <Mail className="h-3.5 w-3.5" /> Email {person.name?.split(" ")[0] || "them"}
        </a>

        <p className="mt-8 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
          Tickets held
        </p>

        {tickets.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-[var(--dl-ink-soft)]">
            No individual tickets on record — this purchase predates ticket
            issuing.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {tickets.map((t) => {
              const isIn = t.status === "checked_in" || !!t.checked_in_at;
              return (
                <div key={t.id} className="rounded-[3px] border-2 border-[var(--dl-line)] p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[13px] font-bold tracking-[0.04em]">{t.code}</p>
                    <span className={`text-[11px] font-extrabold uppercase tracking-[0.06em] ${isIn ? "text-[#17714A]" : "text-[var(--dl-ink-faint)]"}`}>
                      {isIn ? "checked in" : "not yet in"}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-[var(--dl-ink-soft)]">
                    {t.event_id ? eventNames[t.event_id] ?? "—" : "—"} ·{" "}
                    {t.ticket_type_name || "General admission"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div className={`px-4 py-3 ${bordered ? "border-l-2 border-[var(--dl-line)]" : ""}`}>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-extrabold [font-variant-numeric:tabular-nums]">{value}</p>
    </div>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-NG");
}
