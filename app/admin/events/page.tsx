import Link from "next/link";
import { listEvents } from "@/lib/admin-queries";
import { formatKobo } from "@/lib/money";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td, tdNum,
  Pager, SearchBar, FilterSelect, niceDate,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events — owner", robots: { index: false, follow: false } };

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; state?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listEvents({
    page,
    q: searchParams.q,
    state: searchParams.state,
  });

  return (
    <section>
      <PageHead title="All events" sub="Every event on the platform, newest first." />

      <SearchBar
        action="/admin/events"
        q={searchParams.q}
        placeholder="Search event names…"
        extra={
          <FilterSelect
            name="state"
            value={searchParams.state}
            options={[
              { value: "all", label: "Any state" },
              { value: "live", label: "Live" },
              { value: "draft", label: "Draft" },
              { value: "flagged", label: "Flagged" },
              { value: "suspended", label: "Suspended" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        }
      />

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty
            title="Nothing here"
            body={
              searchParams.q
                ? "No event matches that search. Try a shorter word."
                : "No events on the platform yet."
            }
          />
        ) : (
          <Scroll>
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Event</th>
                  <th className={th}>Organiser</th>
                  <th className={th}>Date</th>
                  <th className={th}>State</th>
                  <th className={`${th} text-right`}>Sold</th>
                  <th className={`${th} text-right`}>Taken</th>
                  <th className={`${th} text-right`}>Our fee</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-black/[0.02]">
                    <td className={td}>
                      <Link
                        href={`/admin/events/${e.id}` as never}
                        className="font-extrabold hover:underline"
                      >
                        {e.title}
                      </Link>
                      {e.location && (
                        <span className="block text-[12.5px] text-[var(--dl-ink-soft)]">
                          {e.location}
                        </span>
                      )}
                    </td>
                    <td className={td}>
                      {e.organiserId ? (
                        <Link
                          href={`/admin/organisers/${e.organiserId}` as never}
                          className="hover:underline"
                        >
                          {e.organiserName}
                        </Link>
                      ) : (
                        e.organiserName
                      )}
                    </td>
                    <td className={td}>{niceDate(e.date)}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={stateTone(e.publishStatus)}>
                          {e.publishStatus === "published" ? "Live" : "Draft"}
                        </Badge>
                        {e.adminState !== "ok" && (
                          <Badge tone={stateTone(e.adminState)}>{e.adminState}</Badge>
                        )}
                      </div>
                    </td>
                    <td className={tdNum}>{e.ticketsSold.toLocaleString("en-NG")}</td>
                    <td className={tdNum}>{formatKobo(e.grossKobo)}</td>
                    <td className={tdNum}>{formatKobo(e.feesKobo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <Pager
        page={page}
        total={total}
        pageSize={pageSize}
        base="/admin/events"
        params={{ q: searchParams.q, state: searchParams.state }}
      />
    </section>
  );
}
