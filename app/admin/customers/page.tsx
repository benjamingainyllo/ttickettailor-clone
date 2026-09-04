import Link from "next/link";
import { findCustomers, getCustomerDetail } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { notFound } from "next/navigation";
import { formatKobo } from "@/lib/money";
import {
  panel, label, PageHead, Figures, Badge, stateTone, Empty, Scroll,
  th, td, tdNum, SearchBar, niceDate, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers — owner", robots: { index: false, follow: false } };

/**
 * Buyers are searched, never browsed.
 *
 * There is no "list every customer" here and that is deliberate: paging
 * idly through every buyer's phone number is not a thing an admin should
 * be able to do without meaning to. You look somebody up because you are
 * helping them.
 */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; email?: string };
}) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();

  const q = searchParams.q?.trim() ?? "";
  const email = searchParams.email?.trim() ?? "";

  if (email) {
    const c = await getCustomerDetail(email);
    return (
      <section>
        <Link href="/admin/customers" className="mb-6 inline-block text-[13px] font-extrabold uppercase tracking-[0.04em]">
          ← Customers
        </Link>
        <PageHead title={c.name ?? c.email} sub={[c.email, c.phone].filter(Boolean).join(" · ")} />

        <Figures
          items={[
            { n: formatKobo(c.spentKobo), l: "Spent" },
            { n: String(c.paidOrders), l: "Paid orders" },
            { n: String(c.tickets.length), l: "Tickets" },
            { n: String(c.refunds), l: "Refunds" },
            { n: String(c.events.length), l: "Events" },
          ]}
        />

        <p className={`${label} mt-8`}>Orders</p>
        <div className={`${panel} mt-3`}>
          {c.orders.length === 0 ? (
            <Empty title="No orders" body="Nothing under that address." />
          ) : (
            <Scroll>
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Reference</th>
                    <th className={th}>Event</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}>Qty</th>
                    <th className={`${th} text-right`}>Amount</th>
                    <th className={th}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {c.orders.map((o: any) => (
                    <tr key={o.id}>
                      <td className={`${td} font-mono text-[12.5px]`}>{o.reference}</td>
                      <td className={td}>
                        {o.event ? (
                          <Link href={`/admin/events/${o.event.id}` as never} className="hover:underline">
                            {o.event.title}
                          </Link>
                        ) : (
                          o.item_title ?? "—"
                        )}
                      </td>
                      <td className={td}>
                        <Badge tone={stateTone(o.status)}>{o.status}</Badge>
                      </td>
                      <td className={tdNum}>{o.quantity ?? 1}</td>
                      <td className={tdNum}>{formatKobo(Number(o.gross_kobo ?? 0))}</td>
                      <td className={td}>{niceDateTime(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
          )}
        </div>

        <p className={`${label} mt-8`}>Their tickets</p>
        <div className={`${panel} mt-3`}>
          {c.tickets.length === 0 ? (
            <Empty title="No tickets" body="Nothing issued to that address." />
          ) : (
            <div className="flex flex-wrap gap-2 p-4">
              {c.tickets.map((t: any) => (
                <span
                  key={t.id}
                  className={`rounded-[2px] border-2 px-2 py-1 font-mono text-[11.5px] ${
                    t.checked_in_at
                      ? "border-[var(--mint)] bg-[#E4F5EC]"
                      : t.status === "valid"
                        ? "border-[var(--dl-line)]"
                        : "border-[var(--dl-danger)] bg-[#FFF1F3]"
                  }`}
                >
                  {t.code}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  const results = q ? await findCustomers(q) : [];

  return (
    <section>
      <PageHead
        title="Customers"
        sub="Search by name, email, phone or an order reference."
      />
      <SearchBar action="/admin/customers" q={q} placeholder="Name, email, phone or reference…" />

      <div className={panel}>
        {!q ? (
          <Empty
            title="Search for somebody"
            body="Buyers are looked up, not browsed — there's no reason to page through everyone's phone number."
          />
        ) : results.length === 0 ? (
          <Empty title="Nothing found" body={`No buyer matches "${q}".`} />
        ) : (
          <Scroll>
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Buyer</th>
                  <th className={th}>Phone</th>
                  <th className={`${th} text-right`}>Orders</th>
                  <th className={`${th} text-right`}>Tickets</th>
                  <th className={`${th} text-right`}>Spent</th>
                  <th className={`${th} text-right`}>Refunds</th>
                  <th className={th}>Last order</th>
                </tr>
              </thead>
              <tbody>
                {results.map((c) => (
                  <tr key={c.email} className="hover:bg-black/[0.02]">
                    <td className={td}>
                      <Link
                        href={`/admin/customers?email=${encodeURIComponent(c.email)}` as never}
                        className="font-extrabold hover:underline"
                      >
                        {c.name ?? c.email}
                      </Link>
                      <span className="block text-[12.5px] text-[var(--dl-ink-soft)]">{c.email}</span>
                    </td>
                    <td className={td}>{c.phone ?? "—"}</td>
                    <td className={tdNum}>{c.orders}</td>
                    <td className={tdNum}>{c.ticketsBought}</td>
                    <td className={tdNum}>{formatKobo(c.spentKobo)}</td>
                    <td className={tdNum}>{c.refunds || "—"}</td>
                    <td className={td}>{niceDate(c.lastOrderAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>
    </section>
  );
}
