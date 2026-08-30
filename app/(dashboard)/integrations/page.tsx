import Link from "next/link";
import { Database, CreditCard, Mail, BarChart3, MessageCircle, Hammer, Check, TriangleAlert } from "lucide-react";
import { isDemoPaymentMode } from "@/lib/payments";

// Connection status is read from the environment at request time. Without
// this the page would be baked at build time and could keep reporting demo
// mode after a real gateway key was added.
export const dynamic = "force-dynamic";

/**
 * Two honest halves: what is actually wired up right now, and what isn't
 * built yet. Nothing is listed as connected unless it really is.
 */
export default function IntegrationsPage() {
  const demo = isDemoPaymentMode();
  const hasDatabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const hasServerKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const connected = [
    {
      icon: Database,
      name: "Supabase",
      role: "Accounts, database and file storage",
      status: hasDatabase ? ("live" as const) : ("missing" as const),
      detail: hasDatabase
        ? hasServerKey
          ? "Connected."
          : "Connected, but SUPABASE_SERVICE_ROLE_KEY is missing — orders can't be recorded until it's set."
        : "Not configured.",
    },
    {
      icon: CreditCard,
      name: "Payments",
      role: "Taking money and settling it to creators",
      status: demo ? ("demo" as const) : ("live" as const),
      detail: demo
        ? "Running in demo mode. Checkout works end to end, but no money moves and nothing talks to a real processor."
        : "A live payment gateway is configured.",
    },
  ];

  const planned = [
    { icon: Mail, name: "Email", role: "Receipts, access links and broadcasts to your audience" },
    { icon: MessageCircle, name: "Messaging", role: "Reminders and delivery over chat apps" },
    { icon: BarChart3, name: "Analytics", role: "Where your storefront traffic actually comes from" },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">Integrations</h1>
        <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">What Paylance is connected to.</p>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">In use now</p>

        {connected.map((item) => (
          <div
            key={item.name}
            className="flex flex-col gap-3 rounded-[3px] border-2 border-[var(--dl-line)] bg-surface p-5 sm:flex-row sm:items-center"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-muted text-subtle">
              <item.icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text">{item.name}</p>
              <p className="text-xs text-subtle">{item.role}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-subtle">{item.detail}</p>
            </div>

            <StatusPill status={item.status} />
          </div>
        ))}
      </div>

      {demo && (
        <div className="flex items-start gap-3 rounded-[3px] border border-[#FFDE5940] bg-[#FFDE591a] p-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--marker)]" />
          <p className="text-xs leading-relaxed text-subtle">
            Demo mode ends the moment a payment gateway key is added — no code changes, no
            migration. Until then, treat every amount in the dashboard as practice data.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">Not built yet</p>

        {planned.map((item) => (
          <div key={item.name} className="flex items-center gap-3 rounded-[3px] border-2 border-[var(--dl-line)] bg-surface/50 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-muted/50 text-subtle/60">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-subtle">{item.name}</p>
              <p className="text-xs text-subtle/70">{item.role}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-subtle">
              <Hammer className="h-3 w-3" />
              Planned
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/payouts"
        className="inline-flex h-10 items-center justify-center rounded-[3px] bg-text px-5 text-xs font-bold text-background transition-transform hover:scale-[1.02]"
      >
        Go to payouts
      </Link>
    </section>
  );
}

function StatusPill({ status }: { status: "live" | "demo" | "missing" }) {
  const styles = {
    live: "border-[#9BE3C040] bg-[#9BE3C01a] text-[var(--mint)]",
    demo: "border-[#FFDE5940] bg-[#FFDE591a] text-[var(--marker)]",
    missing: "border-[#FF547040] bg-[#FF54701a] text-[var(--danger)]",
  }[status];

  const label = { live: "Connected", demo: "Demo mode", missing: "Not set up" }[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-[3px] border px-3 py-1 text-[10px] font-bold uppercase tracking-wider sm:self-auto ${styles}`}
    >
      {status === "live" ? <Check className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
      {label}
    </span>
  );
}
