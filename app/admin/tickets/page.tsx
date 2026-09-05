import Link from "next/link";
import { listTickets } from "@/lib/admin-queries";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td,
  Pager, SearchBar, FilterSelect, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tickets — owner", robots: { index: false, follow: false } };

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listTickets({
    page, q: searchParams.q, status: searchParams.status,
  });

  return (
    <section>
      <PageHead title="Tickets" sub="Every ticket issued. Search by code or holder." />
      <SearchBar
        action="/admin/tickets"
        q={searchParams.q}
        placeholder="Ticket code or holder email…"
        extra={
          <FilterSelect
            name="status"
            value={searchParams.status}
            options={[
              { value: "all", label: "Any status" },
              { value: "valid", label: "Valid" },
              { value: "checked_in", label: "Scanned in" },
              { value: "void", label: "Void" },
              { value: "refunded", label: "Refunded" },
            ]}
          />
        }
      />

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty title="No tickets" body={searchParams.q ? "Nothing matches that search." : "None issued yet."} />
        ) : (
          <Scroll>
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Event</th>
                  <th className={th}>Holder</th>
                  <th className={th}>Status</th>
                  <th className={th}>Scanned in</th>
                  <th className={th}>Issued</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="hover:bg-black/[0.02]">
                    <td className={`${td} font-mono text-[12.5px] font-bold`}>{t.code}</td>
                    <td className={td}>
                      {t.eventId ? (
                        <Link href={`/admin/events/${t.eventId}` as never} className="hover:underline">{t.eventTitle}</Link>
                      ) : t.eventTitle}
                    </td>
                    <td className={td}>
                      {t.holderEmail ? (
                        <Link href={`/admin/customers?email=${encodeURIComponent(t.holderEmail)}` as never} className="hover:underline">
                          {t.holderEmail}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={stateTone(t.status)}>{t.status}</Badge>
                        {t.checkedInAt && <Badge tone="ok">used</Badge>}
                      </div>
                    </td>
                    <td className={td}>{t.checkedInAt ? niceDateTime(t.checkedInAt) : "—"}</td>
                    <td className={td}>{niceDateTime(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} base="/admin/tickets"
        params={{ q: searchParams.q, status: searchParams.status }} />
    </section>
  );
}
