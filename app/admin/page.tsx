import Link from "next/link";
import { getPlatformStats } from "@/lib/platform-stats";
import { listAttention, attentionSummary } from "@/lib/admin-queries";
import { runDetectors } from "@/lib/attention";
import { formatKobo } from "@/lib/money";

// Money that changes by the minute should never be served from a cache.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Paylance — owner",
  robots: { index: false, follow: false },
};

const panel = "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";
const label =
  "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";

function Figure({ n, l, x }: { n: string; l: string; x?: string }) {
  return (
    <div className="min-w-[150px] flex-1 border-l-2 border-[var(--dl-line)] px-5 py-4 first:border-l-0">
      <p className="text-[26px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
        {n}
      </p>
      <p className={`${label} mt-1`}>{l}</p>
      {x && <p className="mt-1 text-[12px] text-[var(--dl-ink-soft)]">{x}</p>}
    </div>
  );
}

function Alert({
  count,
  tone,
  children,
}: {
  count: string;
  tone: "bad" | "flat" | "ok";
  children: React.ReactNode;
}) {
  const chip =
    tone === "bad"
      ? "bg-[var(--dl-danger)] text-white"
      : tone === "ok"
        ? "bg-[var(--mint)] text-white"
        : "bg-[var(--dl-ink)] text-[var(--dl-paper)]";
  return (
    <div className="flex items-start gap-3 border-t-2 border-[var(--dl-line)] px-4 py-3 text-[14px] first:border-t-0">
      <span
        className={`grid h-[26px] min-w-[26px] shrink-0 place-items-center rounded-[2px] px-1 font-mono text-[13px] font-semibold ${chip}`}
      >
        {count}
      </span>
      <span className="pt-[3px]">{children}</span>
    </div>
  );
}

export default async function AdminPage() {
  // The detectors run here too, so the overview is current the moment it
  // opens rather than showing whatever the queue last happened to hold.
  await runDetectors();
  const [s, summary, top] = await Promise.all([
    getPlatformStats(),
    attentionSummary(),
    listAttention({ page: 1, status: "open" }),
  ]);

  const takeRate =
    s.grossKobo > 0 ? `${((s.feesKobo / s.grossKobo) * 100).toFixed(1)}%` : "—";

  const month = new Date().toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  const nothingWrong =
    s.stuckOrders === 0 &&
    s.paidEventsWithoutBank.length === 0 &&
    s.soldButNobodyCameIn.length === 0;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[44px]">
            Paylance,{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic tracking-[-0.01em]">
              this month.
            </span>
          </h1>
          <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">
            {month} · {s.organisers} {s.organisers === 1 ? "organiser" : "organisers"} ·{" "}
            {s.eventsPublishedPaid} selling, {s.eventsPublishedFree} free,{" "}
            {s.eventsDraft} in draft
          </p>
        </div>
        <Link
          href="/overview"
          className="rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em]"
        >
          Your own dashboard
        </Link>
      </div>

      {/* Money first. It is the reason this screen exists. */}
      <div className={`${panel} mt-8 flex flex-wrap`}>
        <Figure n={formatKobo(s.feesThisMonthKobo)} l="Your fees" x="this month" />
        <Figure
          n={formatKobo(s.grossThisMonthKobo)}
          l="Moved through"
          x="gross, all organisers"
        />
        <Figure n={takeRate} l="Effective take" x="fees ÷ gross, all time" />
        <Figure
          n={String(s.ticketsPaid)}
          l="Tickets sold"
          x={`${s.paidOrders} paid ${s.paidOrders === 1 ? "order" : "orders"}`}
        />
      </div>

      {/* Free, kept on its own row and out of every number above it. Worth
          watching — free events are how a lot of organisers arrive — but
          reading them beside the money is how you fool yourself. */}
      <div className={`${panel} mt-3 flex flex-wrap`}>
        <Figure
          n={String(s.ticketsFree)}
          l="Free tickets"
          x="no fee charged, no revenue"
        />
        <Figure
          n={String(s.freeRegistrations)}
          l="Free registrations"
          x="settled orders with nothing on them"
        />
        <Figure
          n={String(s.eventsPublishedFree)}
          l="Free events"
          x="on sale at ₦0"
        />
      </div>

      <div className="mt-9 flex items-baseline justify-between gap-4">
        <p className={label}>Needs looking at</p>
        <Link href="/admin/attention" className="text-[12.5px] font-bold underline underline-offset-2">
          {summary.total > 0 ? `See all ${summary.total}` : "See all"}
        </Link>
      </div>

      {/* The real queue, worst first. The hand-written checks below it
          stay because they answer questions the queue does not — they are
          about the shape of the platform, not about individual incidents. */}
      {summary.available && top.rows.length > 0 && (
        <div className={`${panel} mt-3`}>
          {top.rows.slice(0, 6).map((item: any, i: number) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-4 py-3 text-[14px] ${i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""}`}
            >
              <span
                className={`grid h-[26px] min-w-[26px] shrink-0 place-items-center rounded-[2px] px-1 font-mono text-[10px] font-semibold uppercase ${
                  item.severity === "critical"
                    ? "bg-[var(--dl-danger)] text-white"
                    : item.severity === "high"
                      ? "bg-[#8A5A00] text-white"
                      : "bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                }`}
              >
                {item.severity.slice(0, 4)}
              </span>
              <span className="min-w-0 pt-[3px]">
                <b>{item.title}</b>
                {item.detail ? ` ${item.detail}` : ""}
              </span>
            </div>
          ))}
          {summary.total > 6 && (
            <div className="border-t-2 border-[var(--dl-line)] px-4 py-3">
              <Link href="/admin/attention" className="text-[13.5px] font-bold underline underline-offset-2">
                {summary.total - 6} more
              </Link>
            </div>
          )}
        </div>
      )}

      <div className={`${panel} mt-3`}>
        {nothingWrong && s.failedOrders === 0 ? (
          <Alert count="✓" tone="ok">
            Nothing wrong. No stuck payments, nothing selling without a bank
            connected, no event that sold and never opened its doors.
          </Alert>
        ) : (
          <>
            {s.stuckOrders > 0 && (
              <Alert count={String(s.stuckOrders)} tone="bad">
                <b>Paid, no ticket issued.</b> Money taken over half an hour ago
                and settlement never finished.
              </Alert>
            )}
            {s.paidEventsWithoutBank.map((e) => (
              <Alert key={`bank-${e.title}`} count="!" tone="bad">
                <b>{e.title}</b> — {e.organiser} is charging for tickets with no
                bank account connected. {formatKobo(e.grossKobo)} taken so far.
              </Alert>
            ))}
            {s.soldButNobodyCameIn.map((e) => (
              <Alert key={`door-${e.title}`} count="?" tone="bad">
                <b>{e.title}</b> — {e.detail}. {e.organiser},{" "}
                {formatKobo(e.grossKobo)} taken.
              </Alert>
            ))}
            {s.failedOrders > 0 && (
              <Alert count={String(s.failedOrders)} tone="flat">
                <b>Payments failed.</b> Normal in small numbers. Worth watching
                if it climbs.
              </Alert>
            )}
            {nothingWrong && (
              <Alert count="✓" tone="ok">
                Everything else settled cleanly.
              </Alert>
            )}
          </>
        )}
      </div>

      <p className={`${label} mt-9`}>Who is carrying it</p>
      <div className={`${panel} mt-3 overflow-x-auto`}>
        {s.topOrganisers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[16px] font-extrabold tracking-[-0.02em]">No sales yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
              Your organisers appear here as soon as one of them sells something.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-[14.5px]">
            <thead>
              <tr>
                {["Organiser", "Their sales", "Your fees", "Orders"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 ${label} ${i === 0 ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.topOrganisers.map((o) => (
                <tr key={o.name} className="border-t-2 border-[var(--dl-line)]">
                  <td className="px-4 py-3 font-bold">
                    {o.handle ? (
                      <a href={`/${o.handle}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        {o.name}
                      </a>
                    ) : (
                      o.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold [font-variant-numeric:tabular-nums]">
                    {formatKobo(o.grossKobo)}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold [font-variant-numeric:tabular-nums]">
                    {formatKobo(o.feesKobo)}
                  </td>
                  <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">
                    {o.orders}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-8 text-[12.5px] leading-relaxed text-[var(--dl-ink-soft)]">
        All time: {formatKobo(s.feesKobo)} earned on {formatKobo(s.grossKobo)} across{" "}
        {s.paidOrders} paid {s.paidOrders === 1 ? "order" : "orders"}. Read-only —
        nothing on this page changes anything.
      </p>
    </main>
  );
}
