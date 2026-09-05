import Link from "next/link";
import { listOrders } from "@/lib/admin-queries";
import { formatKobo } from "@/lib/money";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td, tdNum,
  Pager, SearchBar, FilterSelect, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders — owner", robots: { index: false, follow: false } };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string; eventId?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listOrders({
    page, q: searchParams.q, status: searchParams.status, eventId: searchParams.eventId,
  });

  return (
    <section>
      <PageHead title="Orders" sub="Every order on the platform, newest first." />
      <SearchBar
        action="/admin/orders"
        q={searchParams.q}
        placeholder="Reference, buyer name or email…"
        extra={
          <FilterSelect
            name="status"
            value={searchParams.status}
            options={[
              { value: "all", label: "Any status" },
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
              { value: "failed", label: "Failed" },
              { value: "abandoned", label: "Abandoned" },
              { value: "refunded", label: "Refunded" },
            ]}
          />
        }
      />

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty title="No orders" body={searchParams.q ? "Nothing matches that search." : "Nobody has bought anything yet."} />
        ) : (
          <Scroll>
            <table className="w-full min-w-[940px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Reference</th>
                  <th className={th}>Buyer</th>
                  <th className={th}>Event</th>
                  <th className={th}>Organiser</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Qty</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={th}>When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-black/[0.02]">
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}` as never} className="font-mono text-[12.5px] font-bold hover:underline">
                        {o.reference}
                      </Link>
                    </td>
                    <td className={td}>
                      {o.buyerEmail ? (
                        <Link href={`/admin/customers?email=${encodeURIComponent(o.buyerEmail)}` as never} className="hover:underline">
                          {o.buyerName || o.buyerEmail}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className={td}>
                      {o.eventId ? (
                        <Link href={`/admin/events/${o.eventId}` as never} className="hover:underline">{o.eventTitle}</Link>
                      ) : o.eventTitle}
                    </td>
                    <td className={td}>
                      {o.organiserId ? (
                        <Link href={`/admin/organisers/${o.organiserId}` as never} className="hover:underline">{o.organiserName}</Link>
                      ) : o.organiserName}
                    </td>
                    <td className={td}><Badge tone={stateTone(o.status)}>{o.status}</Badge></td>
                    <td className={tdNum}>{o.quantity}</td>
                    <td className={tdNum}>{formatKobo(o.grossKobo)}</td>
                    <td className={td}>{niceDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} base="/admin/orders"
        params={{ q: searchParams.q, status: searchParams.status }} />
    </section>
  );
}
