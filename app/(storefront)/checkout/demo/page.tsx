"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { completeDemoCheckout, getDemoOrder } from "@/app/actions/checkout";
import { formatKobo } from "@/lib/money";
import { Loader2, CreditCard, TriangleAlert } from "lucide-react";

/**
 * Stand-in for the payment provider's hosted checkout page.
 *
 * Only reachable while no real gateway is configured. It exists so the full
 * buy → pay → order → revenue flow can be walked through end to end during
 * development.
 */
export default function DemoCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="dl flex min-h-screen items-center justify-center font-[family-name:var(--font-bricolage-grotesque)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--dl-ink)]/60" />
        </div>
      }
    >
      <DemoCheckoutContent />
    </Suspense>
  );
}

function DemoCheckoutContent() {
  const reference = useSearchParams().get("reference");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!reference) {
      setError("Missing payment reference.");
      setLoading(false);
      return;
    }

    let active = true;
    getDemoOrder(reference)
      .then((res) => {
        if (!active) return;
        if (res.success) setOrder(res.order);
        else setError(res.error);
      })
      .catch((e) => {
        if (active) setError(e?.message || "Could not load this order.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reference]);

  const finish = (outcome: "paid" | "failed") => {
    startTransition(async () => {
      const res = await completeDemoCheckout(reference as string, outcome);
      if (!res.success) {
        setError(res.error);
        return;
      }
      window.location.href = `/checkout/success?reference=${reference}`;
    });
  };

  if (loading) {
    return (
      <div className="dl flex min-h-screen items-center justify-center font-[family-name:var(--font-bricolage-grotesque)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--dl-ink)]/60" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="dl flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center font-[family-name:var(--font-bricolage-grotesque)]">
        <p className="font-semibold">Can&apos;t open this checkout</p>
        <p className="max-w-md text-sm leading-relaxed text-[var(--dl-ink-faint)]">
          {error ?? "Order not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="dl flex min-h-screen items-center justify-center px-4 py-12 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="w-full max-w-md">
        {/* Unmissable: nothing here is real. */}
        <div className="mb-4 flex items-start gap-3 rounded-[3px] border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-bold text-amber-400">Simulated checkout</p>
            <p className="mt-0.5 text-xs text-amber-200/70">
              No payment gateway is connected, so no money moves. This screen stands in for
              the real payment page so the rest of the flow can be tested.
            </p>
          </div>
        </div>

        <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-7 shadow-xl">
          <div className="flex items-center gap-3 border-b-2 border-[var(--dl-line)] pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-[var(--dl-panel)]">
              <CreditCard className="h-5 w-5 text-[var(--dl-ink)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--dl-ink)]">{order.item_title || "Your order"}</p>
              <p className="text-xs text-[var(--dl-ink-faint)]">{order.buyer_email}</p>
            </div>
          </div>

          <div className="flex items-baseline justify-between py-6">
            <span className="text-sm text-[var(--dl-ink-soft)]">Amount due</span>
            <span className="text-3xl font-bold text-[var(--dl-ink)]">
              {formatKobo(Number(order.gross_kobo))}
            </span>
          </div>

          {order.status !== "pending" ? (
            <p className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]/40 px-4 py-3 text-center text-sm text-[var(--dl-ink-soft)]">
              This order is already marked <strong className="text-[var(--dl-ink)]">{order.status}</strong>.
            </p>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => finish("paid")}
                disabled={isPending}
                className="flex w-full items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] py-4 text-[15px] font-extrabold text-[var(--dl-paper)] disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Simulate successful payment"}
              </button>
              <button
                onClick={() => finish("failed")}
                disabled={isPending}
                className="flex w-full items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] py-3 text-sm font-medium text-[var(--dl-ink-soft)] transition-colors hover:bg-[var(--dl-panel)] disabled:opacity-60"
              >
                Simulate a failed payment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
