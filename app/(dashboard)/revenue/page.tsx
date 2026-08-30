"use client";

import { useEffect, useState } from "react";
import { Banknote, Heart, Plus, Wallet, ShoppingBag } from "lucide-react";
import { TopFilters } from "@/components/dashboard/top-filters";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";

interface Order {
  id: string;
  reference: string;
  item_title: string | null;
  item_type: string;
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

export default function RevenuePage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalNet, setTotalNet] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // The ledger: every order, tickets and merchandise alike.
      const { data: rows } = await supabase
        .from("orders")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (rows) {
        setOrders(rows as Order[]);
        const paid = rows.filter((o: any) => o.status === "paid");
        setTotalRevenue(paid.reduce((sum: number, o: any) => sum + Number(o.gross_kobo || 0), 0));
        setTotalNet(paid.reduce((sum: number, o: any) => sum + Number(o.net_kobo || 0), 0));
        setTotalSales(paid.length);
      }

      const { count } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id);

      setEventsCount(count || 0);
    };

    fetchData();
  }, [user]);

  const paidOrders = orders.filter((o) => o.status === "paid");
  const totalPlatformFee = paidOrders.reduce((sum, o) => sum + Number(o.platform_fee_kobo || 0), 0);
  const totalProviderFee = paidOrders.reduce((sum, o) => sum + Number(o.provider_fee_kobo || 0), 0);

  const metrics = [
    {
      title: "Total Revenue",
      value: formatKobo(totalRevenue),
      change: "all time",
      icon: Banknote,
      iconColor: "#9BE3C0",
      iconBgColor: "rgba(155, 227, 192, 0.1)",
    },
    {
      title: "Settled",
      value: formatKobo(totalNet),
      change: "to your bank",
      icon: Wallet,
      iconColor: "#FF6A45",
      iconBgColor: "rgba(255, 106, 69, 0.1)",
    },
    {
      title: "Total Sales",
      value: String(totalSales),
      change: "completed orders",
      icon: Heart,
      iconColor: "#DDBBF5",
      iconBgColor: "rgba(221, 187, 245, 0.1)",
    },
    {
      title: "Events created",
      value: String(eventsCount),
      change: "drafts and published",
      icon: Plus,
      iconColor: "#B7C4FF",
      iconBgColor: "rgba(183, 196, 255, 0.1)",
    }
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">Revenue</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.href = "/payouts"}
            className="flex h-9 items-center justify-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-muted/50 px-4 text-xs font-semibold text-text transition-colors hover:bg-muted"
          >
            <Wallet className="h-4 w-4" />
            Payouts
          </button>
          <TopFilters />
        </div>
      </div>

      <div className="flex flex-wrap rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-surface p-4 md:p-5">
        <h3 className="text-sm font-semibold text-text mb-4">Revenue breakdown</h3>
        {paidOrders.length > 0 ? (
          <div className="space-y-3 max-w-md">
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Gross</span>
              <span className="font-semibold text-text">{formatKobo(totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Platform fee</span>
              <span className="font-semibold text-text">-{formatKobo(totalPlatformFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Processing fee</span>
              <span className="font-semibold text-text">-{formatKobo(totalProviderFee)}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-text">Settled to your bank</span>
              <span className="font-bold text-[#9BE3C0]">{formatKobo(totalNet)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingBag className="h-10 w-10 text-[var(--dl-ink-faint)] mx-auto mb-3" />
            <p className="text-sm text-subtle">No revenue yet</p>
            <p className="text-xs text-[var(--dl-ink-faint)] mt-1">Your first sale will show up here</p>
          </div>
        )}
      </div>

      {/* Order ledger — every paid order */}
      <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-surface p-4 md:p-5">
        <h3 className="text-sm font-semibold text-text mb-4">Orders</h3>
        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.slice(0, 20).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-[3px] border-2 border-[var(--dl-line)] bg-muted/30 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {order.buyer_name || order.buyer_email}
                  </p>
                  <p className="text-xs text-subtle truncate">
                    {order.item_title || order.item_type} ·{" "}
                    {new Date(order.created_at).toLocaleDateString("en-NG")}
                  </p>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <p
                    className={`text-sm font-bold ${
                      order.status === "paid" ? "text-[#9BE3C0]" : "text-[var(--marker)]"
                    }`}
                  >
                    {formatKobo(Number(order.gross_kobo))}
                  </p>
                  <p className="text-[10px] uppercase text-subtle">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Banknote className="h-12 w-12 text-[var(--dl-ink-faint)] mx-auto mb-3" />
            <p className="text-sm font-medium text-text">No orders yet</p>
            <p className="text-xs text-subtle mt-1">
              When someone buys a ticket, it appears here
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
