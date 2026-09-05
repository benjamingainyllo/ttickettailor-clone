import Link from "next/link";
import { notFound } from "next/navigation";
import { listSettlements } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { roleCan } from "@/lib/admin-roles";
import { formatKobo } from "@/lib/money";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td, tdNum,
  Pager, FilterSelect, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts — owner", robots: { index: false, follow: false } };

/**
 * What Paystack actually did with organisers' money.
 *
 * READ-ONLY, AND THAT IS NOT A GAP. Paystack settles automatically the
 * next business day and confirmed in writing there is no way to hold,
 * reschedule or retry a settlement. A Retry button here would be a button
 * that lies, so there isn't one — the honest thing is the record of what
 * happened and a note saying why nothing can be done to it.
 */
export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  if (!roleCan(admin.role, "read:finance")) {
    return (
      <section>
        <PageHead title="Payouts" />
        <div className={`${panel} px-5 py-6`}>
          <p className="text-[14.5px]">Your role can&apos;t see the platform&apos;s money.</p>
        </div>
      </section>
    );
  }

  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listSettlements({ page, status: searchParams.status });

  return (
    <section>
      <PageHead title="Payouts" sub="Money Paystack has sent to organisers." />

      <div className={`${panel} mb-5 px-5 py-4`}>
        <p className="text-[14px] leading-relaxed text-[var(--dl-ink-soft)]">
          <strong className="text-[var(--dl-ink)]">This screen only watches.</strong>{" "}
          Paystack settles automatically the next business day and has confirmed there is
          no way to hold, reschedule or retry one. There is no queue to manage — by the
          time a payout appears here, the money has already moved.
        </p>
      </div>

      <form action="/admin/payouts" className="mb-5 flex gap-2">
        <FilterSelect
          name="status"
          value={searchParams.status}
          options={[
            { value: "all", label: "Any status" },
            { value: "success", label: "Success" },
            { value: "pending", label: "Pending" },
            { value: "failed", label: "Failed" },
            { value: "reversed", label: "Reversed" },
          ]}
        />
        <button type="submit" className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]">
          Filter
        </button>
      </form>

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty title="Nothing settled yet" body="Settlements appear here as Paystack's webhooks arrive." />
        ) : (
          <Scroll>
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Organiser</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={th}>Status</th>
                  <th className={th}>Reference</th>
                  <th className={th}>Settled</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s: any) => (
                  <tr key={s.id} className="hover:bg-black/[0.02]">
                    <td className={td}>
                      {s.creator_id ? (
                        <Link href={`/admin/organisers/${s.creator_id}` as never} className="font-extrabold hover:underline">
                          {s.organiserName}
                        </Link>
                      ) : s.organiserName}
                    </td>
                    <td className={tdNum}>{formatKobo(Number(s.amount_kobo ?? 0))}</td>
                    <td className={td}><Badge tone={stateTone(s.status)}>{s.status}</Badge></td>
                    <td className={`${td} font-mono text-[12.5px]`}>{s.provider_settlement_id ?? "—"}</td>
                    <td className={td}>{niceDateTime(s.settled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} base="/admin/payouts" params={{ status: searchParams.status }} />
    </section>
  );
}
