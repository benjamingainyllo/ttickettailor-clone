"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, Calendar as CalendarIcon, MapPin, Users, Ticket, DollarSign,
  Eye, Share2, ExternalLink, Inbox, Loader2, Globe, Lock, ScanLine, Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
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
    typeof window !== "undefined" ? `${window.location.origin}/event/${event.id}` : "";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md">
      <div className="relative h-56 w-full overflow-hidden bg-zinc-900 md:h-72">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-700">
            <CalendarIcon className="h-12 w-12 opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <button
          onClick={onBack}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="absolute right-4 top-4">
          <span
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold text-white shadow-lg ${
              isPublished ? "bg-emerald-600" : "bg-zinc-700"
            }`}
          >
            {isPublished ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {isPublished ? "Live" : "Draft"}
          </span>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-2xl font-bold text-white md:text-3xl">{event.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/70">
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

      <div className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-zinc-800/60 bg-black/80 px-4 backdrop-blur-xl md:-mx-6 md:px-6">
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
                    ? "border-blue-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
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
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
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
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <Share2 className="h-3.5 w-3.5" /> Copy link
                </button>
              )}
              <button
                onClick={handleTogglePublish}
                disabled={publishing}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
                  isPublished
                    ? "border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800"
                    : "bg-white text-black hover:bg-zinc-200"
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Revenue", value: formatKobo(grossKobo), icon: DollarSign, accent: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "Attendees", value: String(attendees), icon: Users, accent: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Lowest price", value: priceKobo === 0 ? "Free" : formatKobo(priceKobo), icon: Ticket, accent: "text-purple-500", bg: "bg-purple-500/10" },
                { label: "Orders", value: String(orders.length), icon: Inbox, accent: "text-orange-500", bg: "bg-orange-500/10" },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${m.bg}`}>
                    <m.icon className={`h-4 w-4 ${m.accent}`} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{m.label}</p>
                  <p className={`mt-1 text-xl font-bold ${m.accent}`}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-4 text-sm font-semibold text-white">About this event</h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {event.description || "No description added yet."}
                </p>
              </div>

              <div className="space-y-1 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Location</p>
                <p className="text-sm font-medium text-white">{event.location || "Online"}</p>
                {event.map_link && (
                  <a
                    href={event.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                  >
                    Open map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {!isPublished && (
                  <p className="mt-4 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
                    This event is a draft. Publish it to get a shareable link.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "merch" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <MerchEditor eventId={event.id} />
          </div>
        )}

        {tab === "tickets" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <TicketTypesEditor eventId={event.id} />
          </div>
        )}

        {tab === "attendees" && (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
              </div>
            ) : loadError ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-zinc-400">{loadError}</p>
                <button
                  onClick={fetchOrders}
                  className="mt-4 rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Retry
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-600">
                  <Users className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-white">No attendees yet</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {isPublished
                    ? "Share your event link to start getting sign-ups."
                    : "Publish this event to start getting sign-ups."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {(o.buyer_name || o.buyer_email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {o.buyer_name || o.buyer_email}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{o.buyer_email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-emerald-400">
                        {Number(o.gross_kobo) === 0 ? "Free" : formatKobo(Number(o.gross_kobo))}
                      </p>
                      <p className="text-[10px] text-zinc-600">
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
