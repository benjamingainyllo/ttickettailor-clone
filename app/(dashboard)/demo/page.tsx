"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RotateCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearDemoData,
  getDemoState,
  startDemoSale,
  type DemoState,
} from "@/app/actions/demo";

/**
 * Walk a whole sale, without spending anything.
 *
 * Every piece of this already worked — it was just spread across six
 * screens, so seeing it end to end meant setting up a bank account, an
 * event, a tier, publishing, finding the public link and then buying from
 * yourself. This puts the six steps in one place and does the setup.
 *
 * The steps tick themselves off. State is re-read when the tab regains
 * focus, because the interesting half of this happens in another tab —
 * you buy a ticket over there and come back to find step two done.
 */
export default function DemoPage() {
  const [state, setState] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const res = await getDemoState();
    if (res.ok) {
      setState(res.state);
      setLoadError(null);
    } else {
      setLoadError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Coming back from the buyer tab is the moment the numbers change.
  useEffect(() => {
    const onFocus = () => void load(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const start = async () => {
    setWorking(true);
    const res = await startDemoSale();
    if (res.success) {
      toast.success("Test event created.");
      await load(true);
    } else {
      toast.error(res.error);
    }
    setWorking(false);
  };

  const clear = async () => {
    setWorking(true);
    const res = await clearDemoData();
    if (res.success) {
      toast.success("Test data deleted.");
      await load(true);
    } else {
      toast.error(res.error);
    }
    setWorking(false);
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy it. Select the link and copy it yourself.");
    }
  };

  const panel = "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
      </div>
    );
  }

  if (loadError || !state) {
    return (
      <div className={`${panel} p-6`}>
        <p className="text-[15px] text-[var(--dl-ink-soft)]">
          {loadError ?? "Could not load this page."}
        </p>
        <button
          onClick={() => void load()}
          className="mt-4 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em]"
        >
          Try again
        </button>
      </div>
    );
  }

  const ev = state.event;
  const bought = state.paidOrders > 0;

  /**
   * Built here rather than on the server, deliberately.
   *
   * NEXT_PUBLIC_SITE_URL was set to a placeholder domain on this
   * deployment for a while, which meant every server-built link pointed
   * at somebody else's parked website. The browser is standing on the
   * real address, so this one cannot be wrong.
   */
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const publicUrl = ev ? `${origin}/event/${ev.id}` : "";
  const doorUrl = ev ? `${origin}/events/${ev.id}/door` : "";
  const scanned = state.ticketsScanned > 0;

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">
            See it work,{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic tracking-[-0.01em]">
              end to end.
            </span>
          </h1>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[var(--dl-ink-soft)]">
            A complete run through selling a ticket &mdash; the event, the
            public page, paying, the ticket arriving, and scanning it at the
            door. No money moves at any point.
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          className="flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em]"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {!state.available && (
        <Banner tone="warn">
          <b>A real payment gateway is connected.</b> Test sales are switched
          off, because on a live gateway there is no such thing as a simulated
          payment &mdash; it would be a real charge on a real card.
        </Banner>
      )}

      {state.siteUrlMisconfigured && (
        <Banner tone="warn">
          <b>Your site address setting is wrong, and it affects real tickets.</b>{" "}
          <code className="rounded-[2px] bg-black/[0.07] px-1.5 py-0.5 font-mono text-[13px]">
            NEXT_PUBLIC_SITE_URL
          </code>{" "}
          in Vercel is set to a placeholder, so it is being ignored and links
          fall back to your Vercel address. Set it to{" "}
          <code className="rounded-[2px] bg-black/[0.07] px-1.5 py-0.5 font-mono text-[13px]">
            {origin || "your site address"}
          </code>{" "}
          and redeploy.
        </Banner>
      )}

      {state.available && state.needsMigration && (
        <Banner tone="warn">
          <b>Your database needs updating first.</b> Run{" "}
          <code className="rounded-[2px] bg-black/[0.07] px-1.5 py-0.5 font-mono text-[13px]">
            setup.sql
          </code>{" "}
          in Supabase, then come back and refresh this page.
        </Banner>
      )}

      {state.available && !state.needsMigration && (
        <ol className="space-y-4">
          <Step
            n={1}
            done={Boolean(ev)}
            title="Set up a test event"
            body="Creates a published event with a ₦20,000 ticket, and a demo bank account to receive the money — which a paid event can't be published without."
          >
            {ev ? (
              <p className="text-[14px] text-[var(--dl-ink-soft)]">
                <b className="font-bold text-[var(--dl-ink)]">{ev.title}</b> is
                live and on sale.
              </p>
            ) : (
              <button
                onClick={() => void start()}
                disabled={working}
                className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-5 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)] disabled:opacity-50"
              >
                {working ? "Setting up…" : "Set it up"}
              </button>
            )}
          </Step>

          <Step
            n={2}
            done={bought}
            title="Buy a ticket, as a guest would"
            body="Open the public page in a new tab. Fill in any name, email and phone number — they're yours to make up — then press through to the payment page and choose 'Simulate successful payment'."
            muted={!ev}
          >
            {ev && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-paper)] px-3 py-2.5 font-mono text-[13px] font-semibold">
                    {publicUrl}
                  </code>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void copy(publicUrl)}
                      className="flex h-[42px] items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] px-4 text-[12px] font-extrabold uppercase tracking-[0.04em]"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-[42px] items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]"
                    >
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                {bought && (
                  <p className="text-[14px] text-[var(--dl-ink-soft)]">
                    {state.paidOrders}{" "}
                    {state.paidOrders === 1 ? "sale" : "sales"} so far &mdash;{" "}
                    {state.ticketsIssued}{" "}
                    {state.ticketsIssued === 1 ? "ticket" : "tickets"} issued.
                  </p>
                )}
              </div>
            )}
          </Step>

          <Step
            n={3}
            done={bought}
            title="The ticket goes out"
            body="The moment payment settles, the ticket is issued and sent. WhatsApp goes first, with email as the durable copy — and until either is connected, both are printed to the server log instead of being sent."
            muted={!bought}
          >
            {bought && (
              <p className="text-[14px] leading-relaxed text-[var(--dl-ink-soft)]">
                You&rsquo;ll have seen the ticket on screen straight after
                paying. That page is the real one &mdash; the same link a guest
                gets, with the QR code they show at the door.
              </p>
            )}
          </Step>

          <Step
            n={4}
            done={scanned}
            title="Scan it at the door"
            body="Open the scanner on your phone, point it at the QR code on the ticket, and watch it admit. Scan the same one twice and it refuses — that's the bit worth seeing."
            muted={!bought}
          >
            {ev && bought && (
              <a
                href={doorUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-5 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]"
              >
                Open the door scanner <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {scanned && (
              <p className="mt-3 text-[14px] text-[var(--dl-ink-soft)]">
                {state.ticketsScanned} of {state.ticketsIssued} scanned in.
              </p>
            )}
          </Step>

          <Step
            n={5}
            done={false}
            title="Delete it when you're done"
            body="Removes the test event, its sales and its tickets. Until you do, none of it counts as revenue anywhere — it's flagged as a test and dropped from your owner dashboard."
            muted={!ev}
          >
            {ev && (
              <button
                onClick={() => void clear()}
                disabled={working}
                className="inline-flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-danger)] px-5 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-danger)] disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {working ? "Deleting…" : "Delete the test data"}
              </button>
            )}
          </Step>
        </ol>
      )}

      {state.available && !state.needsMigration && (
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-[var(--dl-ink-soft)]">
          One thing this can&rsquo;t show you: a real card. When you connect
          Paystack, the simulated payment page is replaced by their real one
          and everything either side of it stays exactly as it is here. See
          the{" "}
          <Link href="/payouts" className="font-semibold underline underline-offset-4">
            Payouts
          </Link>{" "}
          page for that.
        </p>
      )}
    </section>
  );
}

function Banner({ tone, children }: { tone: "warn"; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[3px] border-2 border-[var(--dl-line)] bg-[#FFDE59] px-4 py-3.5">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dl-ink)]" />
      <p className="text-[14px] leading-relaxed text-[var(--dl-ink)]">{children}</p>
    </div>
  );
}

function Step({
  n,
  done,
  title,
  body,
  muted,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  body: string;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={`flex gap-4 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-5 sm:p-6 ${
        muted ? "opacity-55" : ""
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[2px] font-mono text-[13px] font-semibold ${
          done
            ? "bg-[var(--mint)] text-white"
            : "bg-[var(--dl-ink)] text-[var(--dl-paper)]"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[17.5px] font-extrabold tracking-[-0.02em]">{title}</h2>
        <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-relaxed text-[var(--dl-ink-soft)]">
          {body}
        </p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </li>
  );
}
