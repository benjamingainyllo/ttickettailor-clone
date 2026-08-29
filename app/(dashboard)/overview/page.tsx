"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CircleDollarSign, Users, ShoppingBag, Ticket, Loader2, Check, ArrowRight,
  Landmark, UserRound, Sparkles, Inbox,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
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

  if (loading) {
    return (
      <section className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-subtle" />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-2xl border border-border bg-surface py-16 text-center">
        <p className="text-sm text-text">{loadError}</p>
        <button
          onClick={load}
          className="mt-4 rounded-lg border border-border bg-muted px-4 py-2 text-xs font-medium text-text"
        >
          Retry
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

    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-text">Welcome, {firstName}</h1>
          <p className="mt-1 text-sm text-subtle">
            Four steps to your first sale. You&apos;ve done {completed} of {steps.length}.
          </p>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className={`flex items-center gap-4 rounded-2xl border border-border p-5 ${
                step.done ? "bg-surface/50" : "bg-surface"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  step.done ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                }`}
              >
                {step.done ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${step.done ? "text-subtle line-through" : "text-text"}`}>
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs text-subtle">{step.body}</p>
              </div>

              {!step.done && (
                <Link
                  href={step.href as any}
                  className="shrink-0 rounded-lg bg-text px-4 py-2 text-xs font-semibold text-background transition-transform hover:scale-[1.03]"
                >
                  {step.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        {draftCount > 0 && (
          <p className="text-xs text-subtle">
            You have {draftCount} unpublished {draftCount === 1 ? "item" : "items"}. Nothing is
            visible to buyers until you publish it.
          </p>
        )}
      </section>
    );
  }

  // ---------------- State 2: up and running ----------------
  const metrics = [
    {
      title: "Revenue",
      value: formatKobo(grossKobo),
      change: `${paidOrders.length} paid ${paidOrders.length === 1 ? "order" : "orders"}`,
      icon: CircleDollarSign,
      iconColor: "#22C55E",
      iconBgColor: "rgba(34, 197, 94, 0.1)",
    },
    {
      title: "Settled to you",
      value: formatKobo(netKobo),
      change: "after fees",
      icon: Landmark,
      iconColor: "#3B82F6",
      iconBgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      title: "Buyers",
      value: String(audienceCount),
      change: audienceCount === 0 ? "no buyers yet" : "in your audience",
      icon: Users,
      iconColor: "#8B5CF6",
      iconBgColor: "rgba(139, 92, 246, 0.1)",
    },
    {
      title: "Live items",
      value: String(publishedCount),
      change: `${draftCount} in draft`,
      icon: ShoppingBag,
      iconColor: "#F97316",
      iconBgColor: "rgba(249, 115, 22, 0.1)",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-subtle">Here&apos;s how things are going.</p>
        </div>
        {profile?.handle && (
          <a
            href={`/${profile.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-2 self-start rounded-lg border border-border bg-muted/50 px-4 text-xs font-semibold text-text transition-colors hover:bg-muted"
          >
            View your storefront <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {!hasBank && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <Landmark className="h-4 w-4 shrink-0 text-blue-500" />
          <p className="flex-1 text-xs text-subtle">Connect your bank to publish paid items.</p>
          <Link href="/payouts" className="shrink-0 text-xs font-bold text-blue-500 hover:underline">
            Connect
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Recent activity</h3>
          <Link href="/revenue" className="text-xs text-subtle hover:text-text">
            See all
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-subtle">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-text">Nothing yet</p>
            <p className="mt-1 text-xs text-subtle">
              Orders will show up here as soon as someone buys.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 8).map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    o.item_type === "event"
                      ? "bg-orange-500/10 text-orange-500"
                      : "bg-blue-500/10 text-blue-500"
                  }`}
                >
                  {o.item_type === "event" ? (
                    <Ticket className="h-4 w-4" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {o.buyer_name || o.buyer_email}
                  </p>
                  <p className="truncate text-xs text-subtle">
                    {o.item_title || o.item_type} ·{" "}
                    {new Date(o.created_at).toLocaleDateString("en-NG")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-bold ${
                      o.status === "paid" ? "text-emerald-500" : "text-amber-500"
                    }`}
                  >
                    {formatKobo(Number(o.gross_kobo))}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-subtle">{o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
