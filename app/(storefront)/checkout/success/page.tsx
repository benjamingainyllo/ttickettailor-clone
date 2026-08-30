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
        <div className="dl flex min-h-screen items-center justify-center font-[family-name:var(--font-bricolage-grotesque)]">
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
    <div className="dl flex min-h-screen items-center justify-center px-4 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="w-full max-w-md rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-8 text-center shadow-xl">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-subtle">Confirming your payment...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--mint)]" />
            <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.03em]">
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
                className="mt-6 block rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] py-3 text-[14px] font-extrabold text-[var(--dl-paper)]"
              >
                Show my tickets
              </Link>
            )}
          </>
        )}

        {status === "pending" && (
          <>
            <Clock className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.03em]">Payment processing</h1>
            <p className="mt-2 text-sm text-subtle">
              We&apos;re still confirming your payment with Paystack. This page will update automatically — you can also refresh in a moment.
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.03em]">Payment not completed</h1>
            <p className="mt-2 text-sm text-subtle">{errorMessage || "Your payment could not be confirmed."}</p>
          </>
        )}
      </div>
    </div>
  );
}
