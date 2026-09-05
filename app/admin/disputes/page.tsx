import Link from "next/link";
import { listDisputes } from "@/lib/admin-queries";
import { formatKobo } from "@/lib/money";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td, tdNum,
  Pager, FilterSelect, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Disputes — owner", robots: { index: false, follow: false } };

/** How long is left, said in words rather than a timestamp to subtract. */
function timeLeft(deadline: string | null): { text: string; urgent: boolean } {
  if (!deadline) return { text: "no deadline given", urgent: false };
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return { text: "—", urgent: false };
  if (ms <= 0) return { text: "deadline passed", urgent: true };
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return { text: `${Math.max(1, Math.round(ms / 60000))} min left`, urgent: true };
  return { text: `${hours}h left`, urgent: hours < 6 };
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listDisputes({ page, status: searchParams.status });

  return (
    <section>
      <PageHead title="Disputes" sub="Chargebacks raised by buyers' banks." />

      <div className={`${panel} mb-5 border-[var(--dl-danger)] bg-[#FFF1F3] px-5 py-4`}>
        <p className="text-[14px] leading-relaxed">
          <strong>Sixteen hours to answer each one.</strong> Miss it and it&apos;s decided
          against us by default — the full ticket price plus an arbitration fee, out of
          Paylance, not the organiser. The strongest evidence is a scanned ticket: it
          proves the buyer walked in.
        </p>
      </div>

      <form action="/admin/disputes" className="mb-5 flex gap-2">
        <FilterSelect
          name="status"
          value={searchParams.status}
          options={[
            { value: "all", label: "Any status" },
            { value: "open", label: "Open" },
            { value: "evidence_submitted", label: "Evidence sent" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
          ]}
        />
        <button type="submit" className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]">
          Filter
        </button>
      </form>

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty title="No disputes" body="Nothing has been charged back. Long may it continue." />
        ) : (
          <Scroll>
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Event</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={th}>Status</th>
                  <th className={th}>Time left</th>
                  <th className={th}>Reason</th>
                  <th className={th}>Raised</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d: any) => {
                  const left = timeLeft(d.deadline_at);
                  return (
                    <tr key={d.id} className="hover:bg-black/[0.02]">
                      <td className={td}>
                        {d.order_id ? (
                          <Link href={`/admin/orders/${d.order_id}` as never} className="font-mono text-[12.5px] font-bold hover:underline">
                            {d.order?.reference ?? "view"}
                          </Link>
                        ) : (
                          <span className="font-mono text-[12px] text-[var(--dl-danger)]">unmatched</span>
                        )}
                      </td>
                      <td className={td}>{d.eventTitle}</td>
                      <td className={tdNum}>{formatKobo(Number(d.amount_kobo ?? 0))}</td>
                      <td className={td}><Badge tone={stateTone(d.status)}>{d.status.replace("_", " ")}</Badge></td>
                      <td className={td}>
                        {d.status === "open" ? (
                          <Badge tone={left.urgent ? "bad" : "warn"}>{left.text}</Badge>
                        ) : "—"}
                      </td>
                      <td className={`${td} max-w-[220px]`}>{d.reason ?? d.category ?? "—"}</td>
                      <td className={td}>{niceDateTime(d.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} base="/admin/disputes" params={{ status: searchParams.status }} />
    </section>
  );
}
