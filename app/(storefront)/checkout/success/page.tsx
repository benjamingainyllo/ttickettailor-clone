"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyCheckout } from "@/app/actions/checkout";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type Status = "loading" | "success" | "pending" | "failed";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<Status>("loading");
  const [itemTitle, setItemTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEvent, setIsEvent] = useState(false);

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setErrorMessage("Missing payment reference.");
      return;
    }

    async function check() {
      const res = await verifyCheckout(reference as string);
      if (!res.success) {
        setStatus("failed");
        setErrorMessage(res.error || "Could not verify payment.");
        return;
      }

      setItemTitle(res.order?.item_title ?? null);
      setIsEvent(res.order?.item_type === "event");

      if (res.status === "paid") {
        setStatus("success");
      } else if (res.status === "failed" || res.status === "abandoned") {
        setStatus("failed");
      } else {
        setStatus("pending");
      }
    }

    check();
  }, [reference]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#3a3a3a] bg-surface p-8 text-center shadow-xl">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-subtle">Confirming your payment...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-bold text-white">
              {isEvent ? "You're going" : "Payment confirmed"}
            </h1>
            <p className="mt-2 text-sm text-subtle">
              {itemTitle
                ? `Your payment for "${itemTitle}" was successful.`
                : "Your payment was successful."}{" "}
              {isEvent
                ? "Your tickets are on their way to your email."
                : "A receipt has been sent to your email."}
            </p>

            {isEvent && reference && (
              <Link
                href={`/tickets/${reference}`}
                className="mt-6 block rounded-xl bg-white py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Show my tickets
              </Link>
            )}
          </>
        )}

        {status === "pending" && (
          <>
            <Clock className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="mt-4 text-xl font-bold text-white">Payment processing</h1>
            <p className="mt-2 text-sm text-subtle">
              We&apos;re still confirming your payment with Paystack. This page will update automatically — you can also refresh in a moment.
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-white">Payment not completed</h1>
            <p className="mt-2 text-sm text-subtle">{errorMessage || "Your payment could not be confirmed."}</p>
          </>
        )}
      </div>
    </div>
  );
}
