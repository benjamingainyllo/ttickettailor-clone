"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote, Download, Loader2, Search, ShoppingBag, Wallet,
} from "lucide-react";
import { StatTiles, PanelHead } from "@/components/charts/figures";
import { TicketTypeSplit, WeekdayBars } from "@/components/charts/bars";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { buildDashboardShape } from "@/lib/dashboard-shape";

/**
 * Sales.
 *
 * THE HEADLINE IS THE LAST THIRTY DAYS, NOT ALL TIME. An all-time total
 * only moves up, so it says nothing about whether this month went well —
 * six months in it is a number that cannot go down and therefore cannot
 * warn you about anything. The window is thirty days against the thirty
 * before it, which is the comparison an organiser actually makes. The
 * lifetime figures are still here, on one quiet line, because they are
 * worth knowing once rather than watching daily.
 *
 * THE FEE BREAKDOWN STAYS. It is the only place in the product that shows
 * gross, our fee, the card fee and what reached the bank as one sum that
 * adds up. Removing it to make room for a chart would trade the honest
 * part of this page for the decorative one.
 */

interface Order {
  id: string;
  reference: string;
  item_title: string | null;
  item_type: string;
  event_id: string | null;
  quantity: number | null;
  gross_kobo: number;
  platform_fee_kobo: number;
  provider_fee_kobo: number;
  net_kobo: number;
  buyer_email: string;
  buyer_name: string | null;
  status: string;
  payment_channel: string | null;
  paid_at: string | null;
  created_at: string;
}

interface TicketRow {
  ticket_type_name: string | null;
  price_kobo: number | string | null;
  status: string | null;
}

const STATUSES = ["all", "paid", "pending", "refunded", "failed"] as const;
type StatusFilter = (typeof STATUSES)[number];

export default function RevenuePage() {
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [shown, setShown] = useState(25);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data ?? []) as Order[]);

      // Which tier sold. Asked for separately and allowed to fail: an
      // organiser whose database predates ticket tiers still gets the
      // rest of the page rather than an error screen.
      const { data: tix } = await supabase
        .from("tickets")
        .select("ticket_type_name, price_kobo, status")
        .eq("creator_id", user.id);

      setTickets((tix ?? []) as TicketRow[]);
    } catch (error) {
      console.error("Could not load sales:", error);
      setLoadError("Couldn't load your sales.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const paid = useMemo(() => orders.filter((o) => o.status === "paid"), [orders]);
  const shape = useMemo(() => buildDashboardShape(paid), [paid]);

  // Lifetime. Kept because it is worth knowing, shown small because it is
  // not worth watching.
  const lifetime = useMemo(() => {
    let gross = 0, net = 0, platform = 0, provider = 0, ticketCount = 0;
    for (const o of paid) {
      gross += Number(o.gross_kobo || 0);
      net += Number(o.net_kobo || 0);
      platform += Number(o.platform_fee_kobo || 0);
      provider += Number(o.provider_fee_kobo || 0);
      ticketCount += Math.max(1, Math.floor(Number(o.quantity || 0)) || 1);
    }
    return { gross, net, platform, provider, ticketCount, orders: paid.length };
  }, [paid]);

  /**
   * The tier split, preferring real admissions over order titles.
   *
   * A ticket row knows which tier it was, an order only knows what the
   * event was called — so four tickets across three tiers look like one
   * line if you count orders. Orders are the fallback, not the source.
   */
  const tierSplit = useMemo(() => {
    const totals = new Map<string, { tickets: number; grossKobo: number }>();

    if (tickets.length > 0) {
      for (const t of tickets) {
        if (t.status === "void" || t.status === "refunded") continue;
        const name = t.ticket_type_name?.trim() || "General admission";
        const row = totals.get(name) ?? { tickets: 0, grossKobo: 0 };
        row.tickets += 1;
        row.grossKobo += Number(t.price_kobo || 0);
        totals.set(name, row);
      }
    } else {
      for (const o of paid) {
        const name = o.item_title?.trim() || "Ticket";
        const row = totals.get(name) ?? { tickets: 0, grossKobo: 0 };
        row.tickets += Math.max(1, Math.floor(Number(o.quantity || 0)) || 1);
        row.grossKobo += Number(o.gross_kobo || 0);
        totals.set(name, row);
      }
    }

    return Array.from(totals.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 6);
  }, [tickets, paid]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!needle) return true;
      return (
        o.buyer_email?.toLowerCase().includes(needle) ||
        o.buyer_name?.toLowerCase().includes(needle) ||
        o.item_title?.toLowerCase().includes(needle) ||
        o.reference?.toLowerCase().includes(needle)
      );
    });
  }, [orders, search, status]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const rows = [
      ["Reference", "Buyer", "Email", "Item", "Quantity", "Gross (NGN)", "Paylance fee (NGN)", "Card fee (NGN)", "Settled (NGN)", "Status", "Paid at"],
      ...filtered.map((o) => [
        o.reference,
        o.buyer_name ?? "",
        o.buyer_email,
        o.item_title ?? o.item_type,
        String(o.quantity ?? 1),
        (Number(o.gross_kobo || 0) / 100).toFixed(2),
        (Number(o.platform_fee_kobo || 0) / 100).toFixed(2),
        (Number(o.provider_fee_kobo || 0) / 100).toFixed(2),
        (Number(o.net_kobo || 0) / 100).toFixed(2),
        o.status,
        o.paid_at ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `paylance-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const panel = "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";
  const capLabel = "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";
  const chip =
    "rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.06em] transition-transform hover:-translate-y-[1px]";

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
          <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">Sales</h1>
          <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">
            The last 30 days, against the 30 before them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} disabled={filtered.length === 0} className={`${chip} flex h-9 items-center gap-2 disabled:opacity-40`}>
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <Link href="/payouts" className={`${chip} flex h-9 items-center gap-2`}>
            <Wallet className="h-3.5 w-3.5" /> Payouts
          </Link>
        </div>
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
            label: "Money taken",
            value: formatKobo(shape.grossTrend.value),
            trend: shape.grossTrend,
            spark: shape.dailyGross,
            note: "last 30 days",
            tone: "money",
          },
          {
            label: "Settled to you",
            value: formatKobo(shape.netTrend.value),
            trend: shape.netTrend,
            spark: shape.dailyNet,
            note: "after fees",
            tone: "money",
          },
          {
            label: "Tickets sold",
            value: shape.ticketsTrend.value.toLocaleString("en-NG"),
            trend: shape.ticketsTrend,
            spark: shape.dailyTickets,
            tone: "count",
          },
          {
            label: "Orders",
            value: shape.ordersTrend.value.toLocaleString("en-NG"),
            trend: shape.ordersTrend,
            spark: shape.dailyOrders,
            note:
              shape.ordersTrend.value > 0
                ? `${(shape.ticketsTrend.value / shape.ordersTrend.value).toFixed(1)} tickets each`
                : undefined,
            tone: "count",
          },
        ]}
      />

      <p className="text-[13px] text-[var(--dl-ink-soft)]">
        All time:{" "}
        <strong className="text-[var(--dl-ink)]">{formatKobo(lifetime.gross)}</strong> taken across{" "}
        <strong className="text-[var(--dl-ink)]">{lifetime.orders.toLocaleString("en-NG")}</strong>{" "}
        {lifetime.orders === 1 ? "order" : "orders"} and{" "}
        <strong className="text-[var(--dl-ink)]">{lifetime.ticketCount.toLocaleString("en-NG")}</strong>{" "}
        {lifetime.ticketCount === 1 ? "ticket" : "tickets"}.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={panel}>
          <PanelHead
            title="When people buy"
            note="Tickets by day of the week, last 30 days."
            tone="count"
          />
          <WeekdayBars data={shape.byWeekday} />
        </div>

        <div className={panel}>
          <PanelHead
            title="What sells"
            note={`${tickets.length > 0 ? "By ticket type." : "By event."} All time.`}
            tone="money"
          />
          <TicketTypeSplit data={tierSplit} />
        </div>
      </div>

      {/* Where the money went. The one sum on this page that adds up. */}
      <div className={panel}>
        <PanelHead
          title="Where the money went"
          note="Every naira you have taken, all time."
          tone="fee"
        />

        {lifetime.orders > 0 ? (
          <div className="p-5">
            <dl className="max-w-md space-y-3 text-[14px]">
              <Row label="Ticket sales" value={formatKobo(lifetime.gross)} />
              <Row label="Paylance fee" value={`−${formatKobo(lifetime.platform)}`} />
              <Row label="Card processing" value={`−${formatKobo(lifetime.provider)}`} />
              <div className="border-t-2 border-[var(--dl-line)] pt-3">
                <Row
                  label="Reached your bank"
                  value={formatKobo(lifetime.net)}
                  strong
                />
              </div>
            </dl>
            <p className="mt-4 max-w-md text-[12.5px] text-[var(--dl-ink-soft)]">
              You keep{" "}
              <strong className="text-[var(--dl-ink)]">
                {lifetime.gross > 0 ? ((lifetime.net / lifetime.gross) * 100).toFixed(1) : "0"}%
              </strong>{" "}
              of what buyers pay. It settles straight to your own bank account —
              Paylance never holds it.
            </p>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <ShoppingBag className="mx-auto mb-3 h-9 w-9 text-[var(--dl-ink-faint)]" />
            <p className="text-[14px] font-bold">Nothing sold yet</p>
            <p className="mt-1 text-[13px] text-[var(--dl-ink-soft)]">
              Your first sale will show up here, fees and all.
            </p>
          </div>
        )}
      </div>

      {/* The ledger. */}
      <div className={panel}>
        <div
          className="flex flex-col gap-4 border-b-2 border-[var(--dl-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: "var(--dl-neutral-wash)" }}
        >
          <div>
            <p className={capLabel}>Orders</p>
            <p className="mt-1 text-[13px] text-[var(--dl-ink-soft)]">
              {filtered.length.toLocaleString("en-NG")} of {orders.length.toLocaleString("en-NG")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-[var(--dl-ink-faint)]" />
              <input
                type="text"
                placeholder="Name, email or reference"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShown(25); }}
                className="h-9 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-transparent pl-9 pr-3 text-[13px] focus:outline-none sm:w-64"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setShown(25); }}
                  aria-pressed={status === s}
                  className={`${chip} ${status === s ? "bg-[var(--dl-ink)] text-[var(--dl-panel)]" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Banknote className="mx-auto mb-3 h-10 w-10 text-[var(--dl-ink-faint)]" />
            <p className="text-[14px] font-bold">
              {orders.length === 0 ? "No orders yet" : "Nothing matches that"}
            </p>
            <p className="mt-1 text-[13px] text-[var(--dl-ink-soft)]">
              {orders.length === 0
                ? "When someone buys a ticket, it appears here."
                : "Try a different search or status."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead>
                  <tr className="border-b-2 border-[var(--dl-line)]">
                    <Th>Buyer</Th>
                    <Th>What</Th>
                    <Th right>Paid</Th>
                    <Th right>You keep</Th>
                    <Th>When</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, shown).map((o) => (
                    <tr key={o.id} className="border-b border-[var(--dl-line-soft)] last:border-b-0">
                      <td className="px-5 py-3">
                        <p className="font-bold">{o.buyer_name || o.buyer_email}</p>
                        {o.buyer_name && (
                          <p className="text-[12px] text-[var(--dl-ink-soft)]">{o.buyer_email}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <p className="max-w-[240px] truncate">{o.item_title || o.item_type}</p>
                        <p className="text-[12px] text-[var(--dl-ink-soft)]">
                          {(o.quantity ?? 1)} {(o.quantity ?? 1) === 1 ? "ticket" : "tickets"}
                          {o.payment_channel ? ` · ${o.payment_channel}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right font-bold [font-variant-numeric:tabular-nums]">
                        {formatKobo(Number(o.gross_kobo))}
                      </td>
                      <td className="px-5 py-3 text-right [font-variant-numeric:tabular-nums] text-[var(--dl-ink-soft)]">
                        {o.status === "paid" ? formatKobo(Number(o.net_kobo)) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={o.status} />
                        <p className="mt-1 text-[12px] text-[var(--dl-ink-soft)]">
                          {new Date(o.paid_at || o.created_at).toLocaleDateString("en-NG", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length > shown && (
              <div className="border-t-2 border-[var(--dl-line)] p-4 text-center">
                <button onClick={() => setShown((n) => n + 50)} className={chip}>
                  Show 50 more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className={strong ? "font-extrabold" : "text-[var(--dl-ink-soft)]"}>{label}</dt>
      <dd className={`[font-variant-numeric:tabular-nums] ${strong ? "text-[18px] font-extrabold" : "font-bold"}`}>
        {value}
      </dd>
    </div>
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

/** Status in words, not a bare colour — a colour alone is not readable. */
function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    paid: "border-[#17714A] text-[#17714A]",
    pending: "border-[#8A5A00] text-[#8A5A00]",
    refunded: "border-[#7B4FA8] text-[#7B4FA8]",
    failed: "border-[#C9294A] text-[#C9294A]",
    abandoned: "border-[var(--dl-ink-faint)] text-[var(--dl-ink-faint)]",
  };
  return (
    <span
      className={`inline-block rounded-[2px] border-2 px-2 py-[1px] text-[10.5px] font-extrabold uppercase tracking-[0.06em] ${
        tone[status] ?? tone.abandoned
      }`}
    >
      {status}
    </span>
  );
}
