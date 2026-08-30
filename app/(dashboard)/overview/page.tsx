"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Check, ArrowRight, Landmark, UserRound, Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";

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
  const [audienceCount, setAudienceCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);

    try {
      const [payout, events, orderRows, audience] = await Promise.all([
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
        supabase
          .from("audience")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id),
      ]);

      setHasBank(
        payout.data?.status === "active" && Boolean(payout.data?.provider_subaccount_id)
      );

      const items = events.data ?? [];
      setPublishedCount(items.filter((i: any) => i.publish_status === "published").length);
      setDraftCount(items.filter((i: any) => i.publish_status !== "published").length);
      setOrders(orderRows.data ?? []);
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
      <section className="mx-auto max-w-4xl">
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
  const figures = [
    { n: formatKobo(grossKobo), l: "Taken", note: `${paidOrders.length} paid ${paidOrders.length === 1 ? "order" : "orders"}` },
    { n: formatKobo(netKobo), l: "Settled to you", note: "after fees" },
    { n: String(audienceCount), l: "Buyers", note: audienceCount === 0 ? "none yet" : "in your audience" },
    { n: String(publishedCount), l: "Live", note: `${draftCount} in draft` },
  ];

  return (
    <section className="mx-auto max-w-5xl">
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

      {/* One ruled block, not four drifting tiles. */}
      <div className={`${panel} mt-7 flex flex-wrap`}>
        {figures.map((f, i) => (
          <div
            key={f.l}
            className={`min-w-[152px] flex-1 px-5 py-4 ${
              i !== 0 ? "border-l-2 border-[var(--dl-line)]" : ""
            }`}
          >
            <p className="text-[27px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
              {f.n}
            </p>
            <p className={`${label} mt-1`}>{f.l}</p>
            <p className="mt-1 text-[12px] text-[var(--dl-ink-soft)]">{f.note}</p>
          </div>
        ))}
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
