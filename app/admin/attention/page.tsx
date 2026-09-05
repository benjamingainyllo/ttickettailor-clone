import { notFound } from "next/navigation";
import { listAttention } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { runDetectors } from "@/lib/attention";
import { AttentionRow } from "@/components/admin/attention-row";
import { panel, PageHead, Empty, Pager, FilterSelect } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Needs attention — owner", robots: { index: false, follow: false } };

/**
 * The queue.
 *
 * Detectors run on load rather than on a schedule, because there is no
 * scheduler in this deployment and a problem nobody has looked at is not
 * urgent by definition — the moment somebody opens this page is exactly
 * when it needs to be current.
 */
export default async function AttentionPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; severity?: string };
}) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();

  await runDetectors();

  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listAttention({
    page, status: searchParams.status, severity: searchParams.severity,
  });

  return (
    <section>
      <PageHead
        title="Needs attention"
        sub="Everything on the platform that a person should look at. Worst first."
      />

      <form action="/admin/attention" className="mb-5 flex flex-wrap gap-2">
        <FilterSelect
          name="status"
          value={searchParams.status}
          options={[
            { value: "open", label: "Open" },
            { value: "investigating", label: "Being looked at" },
            { value: "resolved", label: "Resolved" },
            { value: "ignored", label: "Ignored" },
          ]}
        />
        <FilterSelect
          name="severity"
          value={searchParams.severity}
          options={[
            { value: "all", label: "Any severity" },
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
        <button type="submit" className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]">
          Filter
        </button>
      </form>

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty
            title="Nothing needs you"
            body="No stuck payments, no failed refunds, no chargebacks, nobody selling without a bank connected."
          />
        ) : (
          rows.map((item: any, i: number) => (
            <AttentionRow key={item.id} item={item} first={i === 0} />
          ))
        )}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} base="/admin/attention"
        params={{ status: searchParams.status, severity: searchParams.severity }} />
    </section>
  );
}
