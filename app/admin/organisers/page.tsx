import Link from "next/link";
import { listOrganisers } from "@/lib/admin-queries";
import { formatKobo } from "@/lib/money";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td, tdNum,
  Pager, SearchBar, FilterSelect, niceDate,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organisers — owner", robots: { index: false, follow: false } };

export default async function AdminOrganisersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; state?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listOrganisers({
    page,
    q: searchParams.q,
    state: searchParams.state,
  });

  return (
    <section>
      <PageHead title="Organisers" sub="Everyone who can sell on the platform." />

      <SearchBar
        action="/admin/organisers"
        q={searchParams.q}
        placeholder="Search name or handle…"
        extra={
          <FilterSelect
            name="state"
            value={searchParams.state}
            options={[
              { value: "all", label: "Any state" },
              { value: "ok", label: "OK" },
              { value: "flagged", label: "Flagged" },
              { value: "restricted", label: "Restricted" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
        }
      />

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty
            title="Nobody here"
            body={
              searchParams.q
                ? "No organiser matches that search."
                : "No organisers have signed up yet."
            }
          />
        ) : (
          <Scroll>
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Organiser</th>
                  <th className={th}>State</th>
                  <th className={th}>Bank</th>
                  <th className={`${th} text-right`}>Events</th>
                  <th className={`${th} text-right`}>Sold</th>
                  <th className={`${th} text-right`}>Taken</th>
                  <th className={`${th} text-right`}>Our fee</th>
                  <th className={th}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-black/[0.02]">
                    <td className={td}>
                      <Link
                        href={`/admin/organisers/${o.id}` as never}
                        className="font-extrabold hover:underline"
                      >
                        {o.name}
                      </Link>
                      {o.handle && (
                        <span className="block text-[12.5px] text-[var(--dl-ink-soft)]">
                          @{o.handle}
                        </span>
                      )}
                    </td>
                    <td className={td}>
                      <Badge tone={stateTone(o.accountState)}>{o.accountState}</Badge>
                    </td>
                    <td className={td}>
                      {o.bankConnected ? (
                        <Badge tone="ok">connected</Badge>
                      ) : (
                        <Badge tone="warn">none</Badge>
                      )}
                    </td>
                    <td className={tdNum}>{o.events}</td>
                    <td className={tdNum}>{o.ticketsSold.toLocaleString("en-NG")}</td>
                    <td className={tdNum}>{formatKobo(o.grossKobo)}</td>
                    <td className={tdNum}>{formatKobo(o.feesKobo)}</td>
                    <td className={td}>{niceDate(o.createdAt)}</td>
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
        base="/admin/organisers"
        params={{ q: searchParams.q, state: searchParams.state }}
      />
    </section>
  );
}
