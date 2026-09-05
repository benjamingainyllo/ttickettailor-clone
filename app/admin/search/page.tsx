import Link from "next/link";
import { notFound } from "next/navigation";
import { globalSearch } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { panel, label, PageHead, Badge, stateTone, Empty, niceDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search — owner", robots: { index: false, follow: false } };

export default async function AdminSearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();

  const q = (searchParams.q ?? "").trim();
  const r = q ? await globalSearch(q) : null;
  const nothing =
    r && !r.orders.length && !r.tickets.length && !r.events.length && !r.organisers.length;

  const row = "block px-5 py-3.5 text-[14px] transition-colors hover:bg-black/[0.02]";

  return (
    <section>
      <PageHead title={q ? `“${q}”` : "Search"} sub="Orders, tickets, events and people." />

      {!q ? (
        <div className={panel}>
          <Empty title="Type something" body="Use the box at the top. Two characters or more." />
        </div>
      ) : nothing ? (
        <div className={panel}>
          <Empty title="Nothing found" body={`No order, ticket, event or person matches “${q}”.`} />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {r!.orders.length > 0 && (
            <div>
              <p className={label}>Orders</p>
              <div className={`${panel} mt-3`}>
                {r!.orders.map((o: any, i: number) => (
                  <Link key={o.id} href={`/admin/orders/${o.id}` as never}
                    className={`${row} ${i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""}`}>
                    <span className="font-mono text-[13px] font-bold">{o.reference}</span>
                    <span className="ml-3 text-[var(--dl-ink-soft)]">{o.buyer_name || o.buyer_email}</span>
                    <span className="ml-3"><Badge tone={stateTone(o.status)}>{o.status}</Badge></span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {r!.tickets.length > 0 && (
            <div>
              <p className={label}>Tickets</p>
              <div className={`${panel} mt-3`}>
                {r!.tickets.map((t: any, i: number) => (
                  <Link key={t.id} href={(t.order_id ? `/admin/orders/${t.order_id}` : `/admin/tickets?q=${t.code}`) as never}
                    className={`${row} ${i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""}`}>
                    <span className="font-mono text-[13px] font-bold">{t.code}</span>
                    <span className="ml-3"><Badge tone={stateTone(t.status)}>{t.status}</Badge></span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {r!.events.length > 0 && (
            <div>
              <p className={label}>Events</p>
              <div className={`${panel} mt-3`}>
                {r!.events.map((e: any, i: number) => (
                  <Link key={e.id} href={`/admin/events/${e.id}` as never}
                    className={`${row} ${i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""}`}>
                    <span className="font-extrabold">{e.title}</span>
                    <span className="ml-3 text-[var(--dl-ink-soft)]">{niceDate(e.date)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {r!.organisers.length > 0 && (
            <div>
              <p className={label}>Organisers</p>
              <div className={`${panel} mt-3`}>
                {r!.organisers.map((p: any, i: number) => (
                  <Link key={p.id} href={`/admin/organisers/${p.id}` as never}
                    className={`${row} ${i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""}`}>
                    <span className="font-extrabold">{p.name}</span>
                    {p.handle && <span className="ml-3 text-[var(--dl-ink-soft)]">@{p.handle}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
