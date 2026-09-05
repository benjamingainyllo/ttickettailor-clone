"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Check, ArrowRight, Landmark, UserRound, Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { StatTiles } from "@/components/charts/figures";
import { TicketTypeSplit, WeekdayBars } from "@/components/charts/bars";
import { buildDashboardShape, countdown } from "@/lib/dashboard-shape";
import type { SalesOrderRow } from "@/lib/sales-series";

/**
 * The chart's longest range is 90 days, but the fetch reaches back further.
 * A sale is bucketed by when it was PAID, and a checkout begun before the
 * window and paid inside it would otherwise be missing from a day it
 * genuinely belongs to.
 */
const CHART_FETCH_DAYS = 100;

/**
 * Overview has two jobs depending on where the creator is.
 *
 * Nothing published yet → tell them the next thing to do.
 * Something published  → tell them how it's going.
 *
 * Every number here comes from a real query. When there's no data the page
 * says so, rather than dressing a zero up as a metric.
 */
export default function OverviewPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [hasBank, setHasBank] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [chartOrders, setChartOrders] = useState<SalesOrderRow[]>([]);
  const [tiers, setTiers] = useState<{ name: string; tickets: number; grossKobo: number }[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [audienceCount, setAudienceCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);

    try {
      const since = new Date();
      since.setDate(since.getDate() - CHART_FETCH_DAYS);

      const [payout, events, orderRows, chartRows, audience] = await Promise.all([
        supabase
          .from("payout_accounts")
          .select("status, provider_subaccount_id")
          .eq("creator_id", user.id)
          .maybeSingle(),
        supabase.from("events").select("id, publish_status").eq("creator_id", user.id),
        supabase
          .from("orders")
          .select("*")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        // Its own query, and a narrow one. The list above is capped at 50
        // rows for the activity feed; a busy month is thousands of orders,
        // and a chart drawn off the most recent fifty would quietly show a
        // fraction of the month and look like a collapse in sales.
        supabase
          .from("orders")
          .select("status, quantity, gross_kobo, net_kobo, platform_fee_kobo, paid_at, created_at")
          .eq("creator_id", user.id)
          .eq("status", "paid")
          .gte("created_at", since.toISOString())
          .limit(20000),
        supabase
          .from("audience")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id),
      ]);

      // Which of THEIR tiers sell, and what is coming up next. Both are
      // tolerant: a failure here must not take the dashboard down, it
      // just leaves one panel out.
      try {
        const eventIds = (events.data ?? []).map((e: any) => e.id);
        if (eventIds.length) {
          const [{ data: tierRows }, { data: upcoming }] = await Promise.all([
            supabase
              .from("ticket_types")
              .select("name, price_kobo, sold_count, event_id")
              .in("event_id", eventIds),
            supabase
              .from("events")
              .select("id, title, date, time, location, cover_image_url, publish_status")
              .eq("creator_id", user.id)
              .eq("publish_status", "published")
              .gte("date", new Date().toISOString().slice(0, 10))
              .order("date", { ascending: true })
              .limit(1),
          ]);

          // Tiers with the same name across their events are one line —
          // "VIP" is a thing an organiser thinks about once, not per event.
          const byName = new Map<string, { tickets: number; grossKobo: number }>();
          for (const t of tierRows ?? []) {
            const name = (t.name ?? "Ticket").trim() || "Ticket";
            const sold = Number(t.sold_count ?? 0) || 0;
            if (sold <= 0) continue;
            const cur = byName.get(name) ?? { tickets: 0, grossKobo: 0 };
            cur.tickets += sold;
            cur.grossKobo += sold * (Number(t.price_kobo ?? 0) || 0);
            byName.set(name, cur);
          }
          setTiers(
            Array.from(byName.entries())
              .map(([name, v]) => ({ name, ...v }))
              .sort((a, b) => b.tickets - a.tickets)
              .slice(0, 5)
          );
          setNextEvent(upcoming?.[0] ?? null);
        }
      } catch (error) {
        console.error("Could not load the extra panels", error);
      }

      setHasBank(
        payout.data?.status === "active" && Boolean(payout.data?.provider_subaccount_id)
      );

      const items = events.data ?? [];
      setPublishedCount(items.filter((i: any) => i.publish_status === "published").length);
      setDraftCount(items.filter((i: any) => i.publish_status !== "published").length);
      setOrders(orderRows.data ?? []);
      setChartOrders((chartRows.data ?? []) as SalesOrderRow[]);
      setAudienceCount(audience.count ?? 0);
    } catch (error) {
      console.error("Overview load failed:", error);
      setLoadError("Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = profile?.first_name || "there";
  const paidOrders = orders.filter((o) => o.status === "paid");
  const grossKobo = paidOrders.reduce((sum, o) => sum + Number(o.gross_kobo || 0), 0);
  const netKobo = paidOrders.reduce((sum, o) => sum + Number(o.net_kobo || 0), 0);

  const isNewCreator = publishedCount === 0 && paidOrders.length === 0;

  // Thirty days against the thirty before them, from the same rows the
  // chart already has. The owner's dashboard uses this exact function on
  // the server, so the two screens cannot disagree about what a rise is.
  const shape = buildDashboardShape(chartOrders as never);

  /* ── Daylight ────────────────────────────────────────────────────
     Colour lives in the paper. Everything drawn on it is a full-ink 2px
     rule and a 3px corner. Acid appears exactly once per screen, on the
     single next action — a second one and neither is pointing at anything.
     ─────────────────────────────────────────────────────────────── */
  const panel =
    "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";
  const label =
    "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";

  if (loading) {
    return (
      <section className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={`${panel} py-14 text-center`}>
        <p className="text-[15px] font-semibold">{loadError}</p>
        <button
          onClick={load}
          className="mt-4 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[13px] font-extrabold"
        >
          Try again
        </button>
      </section>
    );
  }

  // ---------------- State 1: still setting up ----------------
  if (isNewCreator) {
    const steps = [
      {
        done: Boolean(profile?.handle),
        title: "Pick your handle",
        body: "This becomes your public link — the one you share.",
        href: "/settings",
        cta: "Choose handle",
        icon: UserRound,
      },
      {
        done: publishedCount > 0 || draftCount > 0,
        title: "Create your first event",
        body: "It saves as a draft first, so nothing goes on sale until you say so.",
        href: "/events/create",
        cta: "Create an event",
        icon: Sparkles,
      },
      {
        done: hasBank,
        title: "Connect your bank",
        body: "Required before you can publish anything you charge for.",
        href: "/payouts",
        cta: "Connect bank",
        icon: Landmark,
      },
      {
        done: publishedCount > 0,
        title: "Publish and share",
        body: "Publishing gives you a link buyers can open and pay through.",
        href: "/events",
        cta: "Go to your events",
        icon: ArrowRight,
      },
    ];

    const completed = steps.filter((s) => s.done).length;
    // The first thing not yet done is the only place acid is allowed.
    const nextIndex = steps.findIndex((s) => !s.done);

    return (
      <section>
        <h1 className="text-[38px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[46px]">
          Welcome,{" "}
          <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic tracking-[-0.01em]">
            {firstName}.
          </span>
        </h1>
        <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">
          Four steps to your first sale. You&apos;ve done {completed} of {steps.length}.
        </p>

        <div className="mt-6 h-3 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-[2px]">
          <div
            // Ink, not acid. A progress bar is not something you click, but
            // it is large and bright, and two acid areas on one screen is
            // exactly the muddle the rule exists to prevent.
            className="h-full rounded-[1px] bg-[var(--dl-ink)] transition-all duration-500"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>

        <ol className={`${panel} mt-6 list-none p-0`}>
          {steps.map((step, i) => (
            <li
              key={step.title}
              className={`flex items-center gap-4 p-5 ${
                i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] ${
                  step.done ? "bg-[var(--dl-ink)] text-[var(--dl-paper)]" : ""
                }`}
              >
                {step.done ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <step.icon className="h-4 w-4" strokeWidth={2.25} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-[15.5px] font-extrabold tracking-[-0.02em] ${
                    step.done ? "text-[var(--dl-ink-faint)] line-through" : ""
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
                  {step.body}
                </p>
              </div>

              {!step.done && (
                <Link
                  href={step.href as never}
                  className={`shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-[1px] ${
                    i === nextIndex
                      ? "bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                      : ""
                  }`}
                >
                  {step.cta}
                </Link>
              )}
            </li>
          ))}
        </ol>

        {draftCount > 0 && (
          <p className="mt-4 text-[13px] text-[var(--dl-ink-soft)]">
            You have {draftCount} unpublished {draftCount === 1 ? "item" : "items"}.
            Nothing is visible to buyers until you publish it.
          </p>
        )}
      </section>
    );
  }

  // ---------------- State 2: up and running ----------------

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[38px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[46px]">
            Welcome back,{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic tracking-[-0.01em]">
              {firstName}.
            </span>
          </h1>
          <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">
            {publishedCount === 1 ? "One event on" : `${publishedCount} events on`}
            {draftCount > 0 && `, ${draftCount} still in draft`}.
          </p>
        </div>

        {profile?.handle && (
          <a
            href={`/${profile.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 shrink-0 items-center gap-2 self-start rounded-[3px] border-2 border-[var(--dl-line)] px-4 text-[12.5px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-[1px] sm:self-auto"
          >
            Your public page <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </a>
        )}
      </div>

      {!hasBank && (
        <div className={`${panel} mt-7 flex flex-wrap items-center gap-3 px-4 py-3`}>
          <Landmark className="h-4 w-4 shrink-0" strokeWidth={2.25} />
          <p className="flex-1 text-[13.5px] font-semibold">
            Connect your bank before you can publish anything you charge for.
          </p>
          <Link
            href="/payouts"
            className="shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]"
          >
            Connect
          </Link>
        </div>
      )}

      {/* Every figure carries a direction. A total on its own doesn't
          tell an organiser whether their event is working. */}
      <div className="mt-7">
        <StatTiles
          items={[
            {
              label: "Taken",
              value: formatKobo(shape.grossTrend.value),
              trend: shape.grossTrend,
              spark: shape.dailyGross,
              note: `${shape.ordersTrend.value} paid ${shape.ordersTrend.value === 1 ? "order" : "orders"}`,
            },
            {
              label: "Settled to you",
              value: formatKobo(shape.netTrend.value),
              trend: shape.netTrend,
              spark: shape.dailyNet,
              note: "after fees",
            },
            {
              label: "Tickets sold",
              value: shape.ticketsTrend.value.toLocaleString("en-NG"),
              trend: shape.ticketsTrend,
              spark: shape.dailyTickets,
              note: "last 30 days",
            },
            {
              label: "Buyers",
              value: String(audienceCount),
              note: audienceCount === 0 ? "none yet" : "all time",
              href: "/audience",
            },
          ]}
        />
      </div>

      <p className="mt-2.5 text-[12.5px] text-[var(--dl-ink-soft)]">
        All time: {formatKobo(grossKobo)} taken, {formatKobo(netKobo)} settled to you across{" "}
        {paidOrders.length} paid {paidOrders.length === 1 ? "order" : "orders"}.
      </p>

      {/* The one thing an organiser actually opens this page for. */}
      {nextEvent && (
        <div className={`${panel} mt-4 flex flex-wrap items-center gap-4 p-4`}>
          {nextEvent.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nextEvent.cover_image_url}
              alt=""
              className="h-16 w-24 shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] object-cover"
            />
          ) : (
            <span className="grid h-16 w-24 shrink-0 place-items-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-paper)] text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--dl-ink-faint)]">
              no art
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className={label}>Next up</p>
            <p className="mt-1 truncate text-[19px] font-extrabold tracking-[-0.03em]">
              {nextEvent.title}
            </p>
            <p className="mt-0.5 text-[13.5px] text-[var(--dl-ink-soft)]">
              {countdown(nextEvent.date)}
              {nextEvent.time ? ` · doors ${nextEvent.time}` : ""}
              {nextEvent.location ? ` · ${nextEvent.location}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={`/events/${nextEvent.id}/message` as never}
              className="rounded-[3px] border-2 border-[var(--dl-line)] px-3.5 py-2 text-[12px] font-extrabold uppercase tracking-[0.04em]"
            >
              Message guests
            </Link>
            <Link
              href={`/events/${nextEvent.id}/door` as never}
              className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-3.5 py-2 text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]"
            >
              Door scanner
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4">
        <SalesChart orders={chartOrders} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className={`${panel} lg:col-span-2`}>
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-[var(--dl-line)] px-5 py-3.5">
            <p className={label}>When people buy</p>
            <p className="text-[12px] text-[var(--dl-ink-soft)]">last 30 days</p>
          </div>
          <WeekdayBars data={shape.byWeekday} />
        </div>

        <div className={panel}>
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-[var(--dl-line)] px-5 py-3.5">
            <p className={label}>What sells</p>
            <Link href="/events" className="text-[12px] font-bold underline underline-offset-2">
              Your events
            </Link>
          </div>
          <TicketTypeSplit data={tiers} />
        </div>
      </div>

      <div className="mt-9 flex items-baseline justify-between">
        <p className={label}>Recent activity</p>
        <Link href="/revenue" className="text-[12.5px] font-bold underline underline-offset-2">
          See all
        </Link>
      </div>

      <div className={`${panel} mt-3`}>
        {orders.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-[16px] font-extrabold tracking-[-0.02em]">Nothing yet</p>
            <p className="mx-auto mt-1 max-w-xs text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
              Orders land here the moment somebody buys.
            </p>
          </div>
        ) : (
          orders.slice(0, 8).map((o, i) => (
            <div
              key={o.id}
              className={`flex items-center gap-4 px-5 py-3.5 ${
                i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-extrabold tracking-[-0.015em]">
                  {o.buyer_name || o.buyer_email}
                </p>
                <p className="truncate text-[12.5px] text-[var(--dl-ink-soft)]">
                  {o.item_title || o.item_type} ·{" "}
                  {new Date(o.created_at).toLocaleDateString("en-NG")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[14.5px] font-extrabold [font-variant-numeric:tabular-nums]">
                  {formatKobo(Number(o.gross_kobo))}
                </p>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
                  {o.status}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
