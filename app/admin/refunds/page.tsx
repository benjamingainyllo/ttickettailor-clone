import Link from "next/link";
import { listRefunds } from "@/lib/admin-queries";
import { formatKobo } from "@/lib/money";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td, tdNum,
  Pager, FilterSelect, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Refunds — owner", robots: { index: false, follow: false } };

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listRefunds({ page, status: searchParams.status });

  return (
    <section>
      <PageHead title="Refunds" sub="Money sent back to buyers. Started from an order." />

      <form action="/admin/refunds" className="mb-5 flex gap-2">
        <FilterSelect
          name="status"
          value={searchParams.status}
          options={[
            { value: "all", label: "Any status" },
            { value: "processing", label: "Processing" },
            { value: "refunded", label: "Refunded" },
            { value: "failed", label: "Failed" },
          ]}
        />
        <button type="submit" className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]">
          Filter
        </button>
      </form>

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty title="No refunds" body="Nothing has been sent back. Start one from any paid order." />
        ) : (
          <Scroll>
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Buyer</th>
                  <th className={th}>Event</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={th}>Status</th>
                  <th className={th}>Reason</th>
                  <th className={th}>When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-black/[0.02]">
                    <td className={td}>
                      {r.order_id ? (
                        <Link href={`/admin/orders/${r.order_id}` as never} className="font-mono text-[12.5px] font-bold hover:underline">
                          {r.order?.reference ?? "view"}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className={td}>{r.order?.buyer_name || r.order?.buyer_email || "—"}</td>
                    <td className={td}>{r.eventTitle}</td>
                    <td className={tdNum}>{formatKobo(Number(r.amount_kobo ?? 0))}</td>
                    <td className={td}>
                      <Badge tone={stateTone(r.status)}>{r.status}</Badge>
                      {r.failure_reason && (
                        <span className="mt-1 block text-[12px] text-[var(--dl-danger)]">{r.failure_reason}</span>
                      )}
                    </td>
                    <td className={`${td} max-w-[240px]`}>{r.reason ?? "—"}</td>
                    <td className={td}>{niceDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} base="/admin/refunds" params={{ status: searchParams.status }} />
    </section>
  );
}
