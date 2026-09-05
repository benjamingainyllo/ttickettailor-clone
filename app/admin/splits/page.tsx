import Link from "next/link";
import { listSplitGroups } from "@/lib/admin-queries";
import { expireStaleSplitGroups } from "@/lib/split";
import { formatKobo } from "@/lib/money";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td, tdNum,
  Pager, SearchBar, FilterSelect, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Split payments — owner", robots: { index: false, follow: false } };

/**
 * Groups buying together.
 *
 * Monitoring only, deliberately. Nothing here can move a participant's
 * money — a group that needs unwinding is unwound by refunding the
 * individual orders, which goes through the same guarded, audited path
 * as every other refund.
 */
export default async function AdminSplitsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; q?: string };
}) {
  // Close out anything whose deadline passed. Groups holding seats they
  // will never fill block an organiser from selling them to anyone else.
  await expireStaleSplitGroups();

  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listSplitGroups({
    page, status: searchParams.status, q: searchParams.q,
  });

  return (
    <section>
      <PageHead title="Split payments" sub="Groups buying tickets together, and how far along each one is." />

      <SearchBar
        action="/admin/splits"
        q={searchParams.q}
        placeholder="Group code or who started it…"
        extra={
          <FilterSelect name="status" value={searchParams.status} options={[
            { value: "all", label: "Any status" },
            { value: "open", label: "Open" },
            { value: "complete", label: "Complete" },
            { value: "expired", label: "Expired" },
            { value: "cancelled", label: "Cancelled" },
            { value: "flagged", label: "Flagged" },
          ]} />
        }
      />

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty
            title="No groups yet"
            body="A buyer starts one from an event page when the organiser has splitting switched on."
          />
        ) : (
          <Scroll>
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Event</th>
                  <th className={th}>Started by</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Paid / seats</th>
                  <th className={`${th} text-right`}>Total</th>
                  <th className={`${th} text-right`}>Paid</th>
                  <th className={`${th} text-right`}>Left</th>
                  <th className={th}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g: any) => (
                  <tr key={g.id} className="hover:bg-black/[0.02]">
                    <td className={td}>
                      <Link href={`/admin/splits/${g.id}` as never} className="font-mono text-[13px] font-bold hover:underline">
                        {g.code}
                      </Link>
                    </td>
                    <td className={td}>
                      {g.event_id ? (
                        <Link href={`/admin/events/${g.event_id}` as never} className="hover:underline">{g.eventTitle}</Link>
                      ) : g.eventTitle}
                    </td>
                    <td className={td}>{g.initiator_name || g.initiator_email}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={g.status === "complete" ? "ok" : g.status === "open" ? "warn" : "bad"}>
                          {g.status}
                        </Badge>
                        {g.status === "open" && g.expired && <Badge tone="bad">past deadline</Badge>}
                      </div>
                    </td>
                    <td className={tdNum}>
                      {g.seatsPaid} / {g.seats}
                      <span className="ml-1 text-[12px] text-[var(--dl-ink-faint)]">
                        ({g.seatsTaken} joined)
                      </span>
                    </td>
                    <td className={tdNum}>{formatKobo(Number(g.total_kobo ?? 0))}</td>
                    <td className={tdNum}>{formatKobo(g.paidKobo)}</td>
                    <td className={tdNum}>{formatKobo(g.remainingKobo)}</td>
                    <td className={td}>{niceDateTime(g.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} base="/admin/splits"
        params={{ q: searchParams.q, status: searchParams.status }} />
    </section>
  );
}
