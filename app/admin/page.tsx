import Link from "next/link";
import { getPlatformStats } from "@/lib/platform-stats";
import { getOverviewShape, listAttention, attentionSummary } from "@/lib/admin-queries";
import { runDetectors } from "@/lib/attention";
import { formatKobo } from "@/lib/money";
import { TicketTypeSplit, WeekdayBars } from "@/components/charts/bars";
import {
  panel, label, Figures, Band, Badge, stateTone, niceDate, th, td, tdNum, Scroll,
} from "@/components/admin/ui";

// Money that changes by the minute should never be served from a cache.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Paylance — owner",
  robots: { index: false, follow: false },
};

/**
 * The console you run the platform from.
 *
 * WHAT IS WRONG COMES FIRST. This screen used to open with a 42px
 * editorial headline, four chart cards and two graphs, and put the broken
 * payments below all of it. That is the shape of a monthly report, not of
 * an operations tool — and an owner does not open this to admire a
 * sparkline, they open it to find out what needs doing before a customer
 * finds out for them. So the queue is the first thing, the numbers are a
 * dense strip under it, the tables are the body, and the two charts sit
 * at the bottom where a background question belongs.
 *
 * EVERY ROW GOES SOMEWHERE. An alert that names a stuck payment and then
 * makes you go and search for it is half a tool. Each item links to the
 * order, event or organiser it is about.
 */

const SEVERITY_RANK: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

/** Where an alert is actually about. */
function alertHref(item: any): string {
  if (item.order_id) return `/admin/orders/${item.order_id}`;
  if (item.event_id) return `/admin/events/${item.event_id}`;
  if (item.creator_id) return `/admin/organisers/${item.creator_id}`;
  return "/admin/attention";
}

export default async function AdminPage() {
  await runDetectors();

  const [s, shape, summary, top] = await Promise.all([
    getPlatformStats(),
    getOverviewShape(),
    attentionSummary(),
    listAttention({ page: 1, status: "open" }),
  ]);

  const takeRate =
    s.grossKobo > 0 ? `${((s.feesKobo / s.grossKobo) * 100).toFixed(1)}%` : "—";

  const alerts = [...top.rows].sort(
    (a: any, b: any) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  );
  const clear = !summary.available || alerts.length === 0;

  return (
    <section className="space-y-7">
      {/* A console labels the screen. It does not open with a headline. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]">Overview</h1>
        <p className="text-[13px] text-[var(--dl-ink-soft)]">
          {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}{" "}
          · {s.organisers} {s.organisers === 1 ? "organiser" : "organisers"} ·{" "}
          {s.eventsPublishedPaid} selling · {s.eventsPublishedFree} free ·{" "}
          {s.eventsDraft} draft
        </p>
      </div>

      {/* ── The queue. First, always. ───────────────────────── */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className={label}>Needs attention</p>
            {!clear && (
              <span className="flex items-center gap-1.5">
                {summary.critical > 0 && (
                  <span className="rounded-[2px] bg-[var(--dl-danger)] px-2 py-[2px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-white">
                    {summary.critical} critical
                  </span>
                )}
                {summary.high > 0 && (
                  <span className="rounded-[2px] bg-[#8A5A00] px-2 py-[2px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-white">
                    {summary.high} high
                  </span>
                )}
                <span className="text-[12.5px] text-[var(--dl-ink-soft)]">
                  {summary.total} open
                </span>
              </span>
            )}
          </div>
          <Link href="/admin/attention" className="text-[12.5px] font-bold underline underline-offset-2">
            {clear ? "Open the queue" : `See all ${summary.total}`}
          </Link>
        </div>

        <div className={`${panel} overflow-hidden`}>
          {clear ? (
            <p className="px-4 py-3.5 text-[14px]">
              <b>Nothing wrong.</b>{" "}
              <span className="text-[var(--dl-ink-soft)]">
                No stuck payments, no failed refunds, no chargebacks, nobody selling
                without a bank connected.
              </span>
            </p>
          ) : (
            <>
              {alerts.slice(0, 7).map((item: any, i: number) => (
                <Link
                  key={item.id}
                  href={alertHref(item) as never}
                  className={`flex items-start gap-3 px-4 py-2.5 text-[14px] transition-colors hover:bg-black/[0.03] ${
                    i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""
                  }`}
                >
                  <span
                    className={`mt-[1px] grid h-[22px] min-w-[52px] shrink-0 place-items-center rounded-[2px] px-1 text-[9.5px] font-extrabold uppercase tracking-[0.06em] ${
                      item.severity === "critical"
                        ? "bg-[var(--dl-danger)] text-white"
                        : item.severity === "high"
                          ? "bg-[#8A5A00] text-white"
                          : "bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                    }`}
                  >
                    {item.severity}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b>{item.title}</b>
                    {item.detail ? (
                      <span className="text-[var(--dl-ink-soft)]"> {item.detail}</span>
                    ) : null}
                  </span>
                  <span className="hidden shrink-0 text-[12px] text-[var(--dl-ink-faint)] sm:block">
                    {niceDate(item.last_seen_at)}
                  </span>
                </Link>
              ))}
              {summary.total > 7 && (
                <div className="border-t-2 border-[var(--dl-line)] px-4 py-2.5">
                  <Link href="/admin/attention" className="text-[13px] font-bold underline underline-offset-2">
                    {summary.total - 7} more
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── The numbers, as a strip rather than a feature. ──── */}
      <div>
        <p className={`${label} mb-2.5`}>Last 30 days</p>
        <Figures
          items={[
            {
              l: "Your fees",
              n: formatKobo(shape.feesTrend.value),
              t: shape.feesTrend,
              tone: "fee",
            },
            {
              l: "Moved through",
              n: formatKobo(shape.grossTrend.value),
              t: shape.grossTrend,
              x: "all organisers",
              tone: "money",
            },
            {
              l: "Tickets sold",
              n: shape.ticketsTrend.value.toLocaleString("en-NG"),
              t: shape.ticketsTrend,
              x: `${shape.ordersTrend.value} orders`,
              tone: "count",
            },
            { l: "Effective take", n: takeRate, x: "fees ÷ gross, all time", tone: "fee" },
            {
              l: "All-time fees",
              n: formatKobo(s.feesKobo),
              x: `on ${formatKobo(s.grossKobo)}`,
              tone: "money",
            },
          ]}
        />
      </div>

      {/* ── The body: two tables, side by side. ─────────────── */}
      {/* min-w-0 on every child: a grid item will not shrink below its own
          content by default, so the min-w-[480px] table below pushed the
          whole column past the right edge of a phone instead of scrolling
          inside its own box. */}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-2.5 flex items-baseline justify-between gap-4">
            <p className={label}>Newest events</p>
            <Link href="/admin/events" className="text-[12.5px] font-bold underline underline-offset-2">
              All events
            </Link>
          </div>
          <div className={panel}>
            {shape.recentEvents.length === 0 ? (
              <p className="px-5 py-8 text-center text-[14px] text-[var(--dl-ink-soft)]">
                Nobody has created an event yet.
              </p>
            ) : (
              shape.recentEvents.slice(0, 6).map((e, i) => (
                <Link
                  key={e.id}
                  href={`/admin/events/${e.id}` as never}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.03] ${
                    i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-extrabold tracking-[-0.01em]">
                      {e.title}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--dl-ink-soft)]">
                      {e.organiserName} · {niceDate(e.date)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13.5px] font-extrabold [font-variant-numeric:tabular-nums]">
                      {formatKobo(e.grossKobo)}
                    </span>
                    <span className="block text-[12px] text-[var(--dl-ink-soft)]">
                      {e.ticketsSold} sold
                    </span>
                  </span>
                  <Badge tone={stateTone(e.publishStatus)}>
                    {e.publishStatus === "published" ? "Live" : "Draft"}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2.5 flex items-baseline justify-between gap-4">
            <p className={label}>Who is carrying it</p>
            <Link href="/admin/organisers" className="text-[12.5px] font-bold underline underline-offset-2">
              All organisers
            </Link>
          </div>
          <div className={panel}>
            {s.topOrganisers.length === 0 ? (
              <p className="px-5 py-8 text-center text-[14px] text-[var(--dl-ink-soft)]">
                Nobody has sold a ticket yet.
              </p>
            ) : (
              <Scroll>
                <table className="w-full min-w-[480px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Organiser</th>
                      <th className={`${th} text-right`}>Their sales</th>
                      <th className={`${th} text-right`}>Your fees</th>
                      <th className={`${th} text-right`}>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.topOrganisers.map((o: any) => (
                      <tr key={o.name} className="hover:bg-black/[0.02]">
                        <td className={`${td} font-extrabold`}>{o.name}</td>
                        <td className={tdNum}>{formatKobo(o.grossKobo)}</td>
                        <td className={tdNum}>{formatKobo(o.feesKobo)}</td>
                        <td className={tdNum}>{o.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </div>
        </div>
      </div>

      {/* ── Background questions, at the bottom. ────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className={`${panel} min-w-0`}>
          <Band title="When people buy" note="last 30 days" tone="count" />
          <WeekdayBars data={shape.byWeekday} />
        </div>

        <div className={`${panel} min-w-0`}>
          <Band
            title="What they buy"
            tone="money"
            right={
              <Link href="/admin/tickets" className="text-[12px] font-bold underline underline-offset-2">
                All tickets
              </Link>
            }
          />
          <TicketTypeSplit data={shape.byTicketType} />
        </div>
      </div>
    </section>
  );
}
