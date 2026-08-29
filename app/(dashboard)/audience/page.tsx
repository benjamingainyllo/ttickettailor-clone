"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Download, Users, UserCheck, Repeat, UsersRound, Loader2, X, Mail, ShoppingBag, Ticket,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { toast } from "sonner";

interface AudienceMember {
  id: string;
  email: string;
  name: string | null;
  stage: string | null;
  total_spent_kobo: number;
  purchase_count: number;
  last_offer: string | null;
  first_seen: string;
  last_seen: string;
}

/** Contacts are derived from purchases — nothing here is entered by hand. */
export default function AudiencePage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [audience, setAudience] = useState<AudienceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AudienceMember | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("audience")
        .select("*")
        .eq("creator_id", user.id)
        .order("last_seen", { ascending: false });

      if (error) throw error;
      setAudience((data ?? []) as AudienceMember[]);
    } catch (error) {
      console.error("Could not load audience:", error);
      setLoadError("Couldn't load your audience.");
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      audience.filter(
        (a) =>
          !search ||
          a.email.toLowerCase().includes(search.toLowerCase()) ||
          a.name?.toLowerCase().includes(search.toLowerCase())
      ),
    [audience, search]
  );

  const buyers = audience.filter((a) => (a.purchase_count ?? 0) > 0).length;
  const repeatBuyers = audience.filter((a) => (a.purchase_count ?? 0) > 1).length;

  const exportCsv = () => {
    if (audience.length === 0) return;

    const rows = [
      ["Name", "Email", "Stage", "Purchases", "Total spent (NGN)", "Last item", "First seen", "Last seen"],
      ...audience.map((a) => [
        a.name ?? "",
        a.email,
        a.stage ?? "lead",
        String(a.purchase_count ?? 0),
        (Number(a.total_spent_kobo ?? 0) / 100).toFixed(2),
        a.last_offer ?? "",
        a.first_seen,
        a.last_seen,
      ]),
    ];

    // Quote every field and double any internal quotes, so names containing
    // commas don't shift the columns.
    const csv = rows
      .map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `paylance-audience-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Audience exported");
  };

  const metrics = [
    { title: "Contacts", value: String(audience.length), icon: Users, accent: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Buyers", value: String(buyers), icon: UserCheck, accent: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Repeat buyers", value: String(repeatBuyers), icon: Repeat, accent: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Audience</h1>
          <p className="mt-1 text-xs text-subtle">
            Everyone who has bought from you. Yours to keep, wherever you go next.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-subtle" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-4 text-xs text-text focus:border-white/20 focus:outline-none sm:w-56"
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={audience.length === 0}
            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-4 text-xs font-semibold text-text transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.title} className="rounded-2xl border border-border bg-surface p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.bg}`}>
              <m.icon className={`h-5 w-5 ${m.accent}`} />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-subtle">
              {m.title}
            </p>
            <p className="mt-1 text-2xl font-bold text-text">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-subtle" />
          </div>
        ) : loadError ? (
          <div className="py-16 text-center">
            <p className="text-sm text-text">{loadError}</p>
            <button
              onClick={load}
              className="mt-4 rounded-lg border border-border bg-muted px-4 py-2 text-xs font-medium text-text"
            >
              Retry
            </button>
          </div>
        ) : audience.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-subtle">
              <UsersRound className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-text">No contacts yet</p>
            <p className="mx-auto mt-1 max-w-xs px-6 text-xs text-subtle">
              Everyone who buys a ticket is added here automatically, with what
              they bought and what they spent.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text">
              <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-subtle">
                <tr>
                  <th className="px-6 py-3 font-semibold">Contact</th>
                  <th className="px-6 py-3 font-semibold">Last purchase</th>
                  <th className="px-6 py-3 font-semibold">Orders</th>
                  <th className="px-6 py-3 font-semibold">Spent</th>
                  <th className="px-6 py-3 font-semibold">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((person) => (
                  <tr
                    key={person.id}
                    onClick={() => setSelected(person)}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={person.name} email={person.email} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{person.name || "—"}</div>
                          <div className="truncate text-xs text-subtle">{person.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-subtle">{person.last_offer || "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-xs">{person.purchase_count ?? 0}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-500">
                      {formatKobo(Number(person.total_spent_kobo ?? 0))}
                    </td>
                    <td className="px-6 py-4 text-xs text-subtle">{timeAgo(person.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p className="py-10 text-center text-xs text-subtle">
                No contacts match &ldquo;{search}&rdquo;.
              </p>
            )}
          </div>
        )}
      </div>

      {selected && <ContactDrawer person={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  const palette = [
    "bg-blue-500/15 text-blue-500",
    "bg-emerald-500/15 text-emerald-500",
    "bg-purple-500/15 text-purple-500",
    "bg-amber-500/15 text-amber-500",
    "bg-rose-500/15 text-rose-500",
  ];
  const tone = palette[email.charCodeAt(0) % palette.length];

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}>
      {initials}
    </div>
  );
}

/** Their full order history — pulled live, not carried in from the table row. */
function ContactDrawer({ person, onClose }: { person: AudienceMember; onClose: () => void }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select("id, item_title, item_type, gross_kobo, status, created_at")
          .eq("creator_id", user?.id)
          .eq("buyer_email", person.email)
          .order("created_at", { ascending: false });
        if (active) setOrders(data ?? []);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [person.email, user?.id, supabase]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={person.name} email={person.email} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-text">{person.name || "—"}</p>
              <p className="truncate text-xs text-subtle">{person.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] uppercase tracking-widest text-subtle">Total spent</p>
            <p className="mt-1 text-lg font-bold text-emerald-500">
              {formatKobo(Number(person.total_spent_kobo ?? 0))}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] uppercase tracking-widest text-subtle">Orders</p>
            <p className="mt-1 text-lg font-bold text-text">{person.purchase_count ?? 0}</p>
          </div>
        </div>

        <a
          href={`mailto:${person.email}`}
          className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 text-xs font-semibold text-text transition-colors hover:bg-muted"
        >
          <Mail className="h-3.5 w-3.5" /> Email {person.name?.split(" ")[0] || "them"}
        </a>

        <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-subtle">
          Purchase history
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-subtle" />
          </div>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-xs text-subtle">No orders recorded.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    o.item_type === "event"
                      ? "bg-orange-500/10 text-orange-500"
                      : "bg-blue-500/10 text-blue-500"
                  }`}
                >
                  {o.item_type === "event" ? (
                    <Ticket className="h-3.5 w-3.5" />
                  ) : (
                    <ShoppingBag className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text">
                    {o.item_title || o.item_type}
                  </p>
                  <p className="text-[10px] text-subtle">
                    {new Date(o.created_at).toLocaleDateString("en-NG")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-xs font-bold ${
                      o.status === "paid" ? "text-emerald-500" : "text-amber-500"
                    }`}
                  >
                    {formatKobo(Number(o.gross_kobo))}
                  </p>
                  <p className="text-[9px] uppercase text-subtle">{o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-NG");
}
