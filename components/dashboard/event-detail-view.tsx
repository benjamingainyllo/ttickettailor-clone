"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, Calendar as CalendarIcon, MapPin, Users, Ticket, Banknote,
  Eye, Share2, ExternalLink, Inbox, Loader2, Globe, Lock, ScanLine, Package, Pencil, Megaphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { useOrigin } from "@/lib/use-origin";
import { publishItem, unpublishItem } from "@/app/actions/publish";
import { TicketTypesEditor } from "@/components/dashboard/ticket-types-editor";
import { MerchEditor } from "@/components/dashboard/merch-editor";
import { toast } from "sonner";

interface EventDetailViewProps {
  event: any;
  onBack: () => void;
  onChanged?: () => void;
}

interface OrderRow {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  gross_kobo: number;
  quantity: number;
  status: string;
  payment_channel: string | null;
  paid_at: string | null;
  created_at: string;
}

export function EventDetailView({ event, onBack, onChanged }: EventDetailViewProps) {
  const [tab, setTab] = useState<"overview" | "tickets" | "merch" | "attendees">("overview");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // useOrigin was imported but never called, so the share link below was
  // reading the bare global `origin`. In a browser that happens to be
  // window.origin, so it worked by accident; anywhere it renders on the
  // server it is a ReferenceError, and the page dies.
  const origin = useOrigin();

  const isPublished = event.publish_status === "published";
  const priceKobo = Number(event.price_kobo ?? 0);

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, buyer_name, buyer_email, gross_kobo, quantity, status, payment_channel, paid_at, created_at")
        .eq("event_id", event.id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false });

      if (error) throw error;
      setOrders((data ?? []) as OrderRow[]);
    } catch (error) {
      console.error("Could not load orders:", error);
      setLoadError("Couldn't load attendees. Try again in a moment.");
    } finally {
      // Always resolves — never an indefinite spinner.
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Revenue is derived from real orders, never accumulated on the event row.
  const grossKobo = orders.reduce((sum, o) => sum + Number(o.gross_kobo || 0), 0);
  const attendees = orders.reduce((sum, o) => sum + Number(o.quantity || 1), 0);

  const handleTogglePublish = async () => {
    setPublishing(true);
    try {
      const res = isPublished
        ? await unpublishItem("event", event.id)
        : await publishItem("event", event.id);

      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(isPublished ? "Event unpublished." : "Event is live.");
      onChanged?.();
      onBack();
    } finally {
      setPublishing(false);
    }
  };

  const shareUrl =
    origin ? `${origin}/event/${event.id}` : "";

  return (
    <div className="dl fixed inset-0 z-50 overflow-y-auto font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="relative h-56 w-full overflow-hidden bg-[var(--dl-panel)] md:h-72">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--dl-ink-faint)]">
            <CalendarIcon className="h-12 w-12 opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <button
          onClick={onBack}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-[3px] bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="absolute right-4 top-4 flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-[3px] px-4 py-1.5 text-[11px] font-bold text-white shadow-lg ${
              isPublished ? "bg-[var(--mint)]" : "bg-[var(--dl-ink)]"
            }`}
          >
            {isPublished ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {isPublished ? "Live" : "Draft"}
          </span>

          <Link
            href={`/events/${event.id}/message`}
            className="flex items-center gap-1.5 rounded-[3px] bg-white/95 px-4 py-1.5 text-[11px] font-bold text-[var(--dl-ink)] shadow-lg transition-transform hover:-translate-y-[1px]"
          >
            <Megaphone className="h-3 w-3" strokeWidth={2.5} />
            Message
          </Link>

          <Link
            href={`/events/${event.id}/edit`}
            className="flex items-center gap-1.5 rounded-[3px] bg-white/95 px-4 py-1.5 text-[11px] font-bold text-[var(--dl-ink)] shadow-lg transition-transform hover:-translate-y-[1px]"
          >
            <Pencil className="h-3 w-3" strokeWidth={2.5} />
            Edit
          </Link>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-2xl font-bold text-white md:text-3xl">{event.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              {event.date
                ? new Date(event.date).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Date TBD"}
              {event.time ? ` • ${event.time}` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {event.location || "Online"}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-12 md:px-8">
        <div className="sticky top-0 z-10 -mx-4 mb-6 border-b-2 border-[var(--dl-line)] bg-[var(--dl-paper)] px-4 md:-mx-6 md:px-6">
          <div className="flex items-center gap-1 py-1">
            {([
              { key: "overview", label: "Overview", icon: Eye },
              { key: "tickets", label: "Tickets", icon: Ticket },
              { key: "merch", label: "Merch", icon: Package },
              { key: "attendees", label: "Attendees", icon: Users },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                  tab === t.key
                    ? "border-[var(--dl-line)] text-[var(--dl-ink)]"
                    : "border-transparent text-[var(--dl-ink-faint)] hover:text-[var(--dl-ink-soft)]"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              {isPublished && (
                <Link
                  href={`/events/${event.id}/door`}
                  className="flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 py-2 text-xs font-medium text-[var(--dl-ink-soft)] transition-colors hover:bg-[var(--dl-paper)]"
                >
                  <ScanLine className="h-3.5 w-3.5" /> Door
                </Link>
              )}
              {isPublished && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    toast.success("Link copied");
                  }}
                  className="flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 py-2 text-xs font-medium text-[var(--dl-ink-soft)] transition-colors hover:bg-[var(--dl-paper)]"
                >
                  <Share2 className="h-3.5 w-3.5" /> Copy link
                </button>
              )}
              <button
                onClick={handleTogglePublish}
                disabled={publishing}
                className={`flex items-center gap-2 rounded-[3px] px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
                  isPublished
                    ? "border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] text-[var(--dl-ink-soft)]"
                    : "border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                }`}
              >
                {publishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isPublished ? (
                  "Unpublish"
                ) : (
                  "Publish"
                )}
              </button>
            </div>
          </div>
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            {/* One ruled block. Same as Overview, Events and everywhere else —
                no tinted icon chips, and the number does the talking. */}
            <div className="flex flex-wrap rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
              {[
                { label: "Revenue", value: formatKobo(grossKobo) },
                { label: "Attendees", value: String(attendees) },
                { label: "Lowest price", value: priceKobo === 0 ? "Free" : formatKobo(priceKobo) },
                { label: "Orders", value: String(orders.length) },
              ].map((m) => (
                <div
                  key={m.label}
                  className="min-w-[152px] flex-1 border-l-2 border-[var(--dl-line)] px-5 py-4 first:border-l-0"
                >
                  <p className="text-[27px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
                    {m.value}
                  </p>
                  <p className="mt-1 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
              <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-6">
                <h3 className="mb-4 text-sm font-semibold text-[var(--dl-ink)]">About this event</h3>
                <p className="text-sm leading-relaxed text-[var(--dl-ink-soft)]">
                  {event.description || "No description added yet."}
                </p>
              </div>

              <div className="space-y-1 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--dl-ink-faint)]">Location</p>
                <p className="text-sm font-medium text-[var(--dl-ink)]">{event.location || "Online"}</p>
                {event.map_link && (
                  <a
                    href={event.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--dl-ink)] hover:underline"
                  >
                    Open map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {!isPublished && (
                  <p className="mt-4 border-t border-[var(--dl-line)] pt-4 text-xs text-[var(--dl-ink-faint)]">
                    This event is a draft. Publish it to get a shareable link.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "merch" && (
          <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]/40 p-5">
            <MerchEditor eventId={event.id} />
          </div>
        )}

        {tab === "tickets" && (
          <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] p-6">
            <TicketTypesEditor eventId={event.id} />
          </div>
        )}

        {tab === "attendees" && (
          <div className="overflow-hidden rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
              </div>
            ) : loadError ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-[var(--dl-ink-soft)]">{loadError}</p>
                <button
                  onClick={fetchOrders}
                  className="mt-4 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]/50 px-4 py-2 text-xs font-medium text-[var(--dl-ink-soft)] hover:bg-[var(--dl-paper)]"
                >
                  Retry
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[3px] bg-[var(--dl-panel)] text-[var(--dl-ink-faint)]">
                  <Users className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-[var(--dl-ink)]">No attendees yet</p>
                <p className="mt-1 text-xs text-[var(--dl-ink-faint)]">
                  {isPublished
                    ? "Share your event link to start getting sign-ups."
                    : "Publish this event to start getting sign-ups."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-[var(--dl-ink)] text-xs font-bold text-white">
                      {(o.buyer_name || o.buyer_email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--dl-ink)]">
                        {o.buyer_name || o.buyer_email}
                      </p>
                      <p className="truncate text-xs text-[var(--dl-ink-faint)]">{o.buyer_email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-[var(--mint)]">
                        {Number(o.gross_kobo) === 0 ? "Free" : formatKobo(Number(o.gross_kobo))}
                      </p>
                      <p className="text-[10px] text-[var(--dl-ink-faint)]">
                        {o.paid_at ? new Date(o.paid_at).toLocaleDateString("en-NG") : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
