import Link from "next/link";
import { getPlatformStats } from "@/lib/platform-stats";
import { getOverviewShape, listAttention, attentionSummary } from "@/lib/admin-queries";
import { runDetectors } from "@/lib/attention";
import { formatKobo } from "@/lib/money";
import { StatTiles } from "@/components/admin/figures";
import { TicketTypeSplit, WeekdayBars } from "@/components/admin/charts";
import { panel, label, Badge, stateTone, niceDate } from "@/components/admin/ui";

// Money that changes by the minute should never be served from a cache.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Paylance — owner",
  robots: { index: false, follow: false },
};

/**
 * The command centre.
 *
 * EVERY FIGURE CARRIES A DIRECTION. A total on its own is not
 * information — "₦3,000 in fees" says nothing until you know it was ₦900
 * the month before. The delta answers "is this going well", the
 * sparkline answers "steadily, or one big Saturday".
 *
 * The two charts underneath answer the two questions a ticketing
 * platform's owner actually has: which tiers people buy, and when they
 * buy them.
 */
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

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[42px]">
            Paylance,{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
              this month.
            </span>
          </h1>
          <p className="mt-2.5 text-[14.5px] text-[var(--dl-ink-soft)]">
            {new Date().toLocaleDateString("en-NG", { month: "long", year: "numeric" })} ·{" "}
            {s.organisers} {s.organisers === 1 ? "organiser" : "organisers"} ·{" "}
            {s.eventsPublishedPaid} selling, {s.eventsPublishedFree} free,{" "}
            {s.eventsDraft} in draft
          </p>
        </div>
        <Link
          href="/overview"
          className="rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-[1px]"
        >
          Your own dashboard
        </Link>
      </div>

      {/* Last 30 days against the 30 before it. */}
      <StatTiles
        items={[
          {
            label: "Your fees",
            value: formatKobo(shape.feesTrend.value),
            trend: shape.feesTrend,
            spark: shape.dailyFees,
            note: "last 30 days",
          },
          {
            label: "Moved through",
            value: formatKobo(shape.grossTrend.value),
            trend: shape.grossTrend,
            spark: shape.dailyGross,
            note: "gross, all organisers",
          },
          {
            label: "Tickets sold",
            value: shape.ticketsTrend.value.toLocaleString("en-NG"),
            trend: shape.ticketsTrend,
            spark: shape.dailyTickets,
            note: `${shape.ordersTrend.value} paid orders`,
          },
          {
            label: "Effective take",
            value: takeRate,
            note: "fees ÷ gross, all time",
          },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className={`${panel} lg:col-span-2`}>
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-[var(--dl-line)] px-5 py-3.5">
            <p className={label}>When people buy</p>
            <p className="text-[12px] text-[var(--dl-ink-soft)]">last 30 days</p>
          </div>
          <WeekdayBars data={shape.byWeekday} />
        </div>

        <div className={panel}>
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-[var(--dl-line)] px-5 py-3.5">
            <p className={label}>What they buy</p>
            <Link href="/admin/tickets" className="text-[12px] font-bold underline underline-offset-2">
              All tickets
            </Link>
          </div>
          <TicketTypeSplit data={shape.byTicketType} />
        </div>
      </div>

      {/* ── Needs looking at ───────────────────────────────── */}
      <div className="mt-9 flex items-baseline justify-between gap-4">
        <p className={label}>Needs looking at</p>
        <Link href="/admin/attention" className="text-[12.5px] font-bold underline underline-offset-2">
          {summary.total > 0 ? `See all ${summary.total}` : "See all"}
        </Link>
      </div>

      <div className={`${panel} mt-3`}>
        {!summary.available || top.rows.length === 0 ? (
          <div className="flex items-start gap-3 px-4 py-3.5 text-[14px]">
            <span className="grid h-[26px] min-w-[26px] shrink-0 place-items-center rounded-[2px] bg-[var(--mint)] px-1 font-mono text-[13px] font-semibold text-white">
              ✓
            </span>
            <span className="pt-[3px]">
              Nothing wrong. No stuck payments, no failed refunds, no chargebacks, nobody
              selling without a bank connected.
            </span>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* ── Newest events ──────────────────────────────────── */}
      <div className="mt-9 flex items-baseline justify-between gap-4">
        <p className={label}>Newest events</p>
        <Link href="/admin/events" className="text-[12.5px] font-bold underline underline-offset-2">
          All events
        </Link>
      </div>

      <div className={`${panel} mt-3`}>
        {shape.recentEvents.length === 0 ? (
          <p className="px-5 py-10 text-center text-[14px] text-[var(--dl-ink-soft)]">
            Nobody has created an event yet.
          </p>
        ) : (
          shape.recentEvents.map((e, i) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}` as never}
              className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-black/[0.02] ${i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""}`}
            >
              {e.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.cover}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] object-cover"
                />
              ) : (
                <span className="grid h-12 w-16 shrink-0 place-items-center rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-paper)] text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--dl-ink-faint)]">
                  no art
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-extrabold tracking-[-0.02em]">
                  {e.title}
                </span>
                <span className="block truncate text-[12.5px] text-[var(--dl-ink-soft)]">
                  {e.organiserName} · {niceDate(e.date)}
                </span>
              </span>
              <span className="hidden shrink-0 text-right sm:block">
                <span className="block text-[14px] font-extrabold [font-variant-numeric:tabular-nums]">
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

      {/* ── Who is carrying it ─────────────────────────────── */}
      <p className={`${label} mt-9`}>Who is carrying it</p>
      <div className={`${panel} mt-3 overflow-x-auto`}>
        {s.topOrganisers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[16px] font-extrabold tracking-[-0.02em]">No sales yet</p>
            <p className="mt-1 text-[13.5px] text-[var(--dl-ink-soft)]">
              The moment somebody sells a ticket, they appear here.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr>
                <th className="border-b-2 border-[var(--dl-line)] px-5 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
                  Organiser
                </th>
                <th className="border-b-2 border-[var(--dl-line)] px-5 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
                  Their sales
                </th>
                <th className="border-b-2 border-[var(--dl-line)] px-5 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
                  Your fees
                </th>
                <th className="border-b-2 border-[var(--dl-line)] px-5 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
                  Orders
                </th>
              </tr>
            </thead>
            <tbody>
              {s.topOrganisers.map((o: any) => (
                <tr key={o.name} className="hover:bg-black/[0.02]">
                  <td className="border-b border-[var(--dl-line-soft)] px-5 py-3 text-[14px] font-extrabold">
                    {o.name}
                  </td>
                  <td className="border-b border-[var(--dl-line-soft)] px-5 py-3 text-right text-[14px] [font-variant-numeric:tabular-nums]">
                    {formatKobo(o.grossKobo)}
                  </td>
                  <td className="border-b border-[var(--dl-line-soft)] px-5 py-3 text-right text-[14px] [font-variant-numeric:tabular-nums]">
                    {formatKobo(o.feesKobo)}
                  </td>
                  <td className="border-b border-[var(--dl-line-soft)] px-5 py-3 text-right text-[14px] [font-variant-numeric:tabular-nums]">
                    {o.orders}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-6 text-[13px] text-[var(--dl-ink-soft)]">
        All time: {formatKobo(s.feesKobo)} earned on {formatKobo(s.grossKobo)} across{" "}
        {s.paidOrders} paid {s.paidOrders === 1 ? "order" : "orders"}.
      </p>
    </section>
  );
}
