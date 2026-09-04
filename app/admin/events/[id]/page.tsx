import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventDetail } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { roleCan } from "@/lib/admin-roles";
import { setEventState } from "@/app/actions/admin";
import { formatKobo } from "@/lib/money";
import { StateControl } from "@/components/admin/state-control";
import { NoteBox } from "@/components/admin/note-box";
import {
  panel, label, PageHead, Figures, Badge, stateTone, Empty, Scroll,
  th, td, tdNum, niceDate, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Event — owner", robots: { index: false, follow: false } };

export default async function AdminEventPage({ params }: { params: { id: string } }) {
  const [detail, admin] = await Promise.all([getEventDetail(params.id), getAdminIdentity()]);
  if (!detail || !admin) notFound();

  const { event, organiser, organiserName, tiers, orders, tickets, money, notes } = detail;
  const canAct = roleCan(admin.role, "write:event_state");

  return (
    <section>
      <Link href="/admin/events" className="mb-6 inline-block text-[13px] font-extrabold uppercase tracking-[0.04em]">
        ← All events
      </Link>

      <PageHead
        title={event.title}
        sub={[niceDate(event.date), event.time, event.location].filter(Boolean).join(" · ")}
        right={
          <div className="flex flex-wrap gap-2">
            <Badge tone={stateTone(event.publish_status)}>
              {event.publish_status === "published" ? "Live" : "Draft"}
            </Badge>
            {event.admin_state !== "ok" && (
              <Badge tone={stateTone(event.admin_state)}>{event.admin_state}</Badge>
            )}
          </div>
        }
      />

      <Figures
        items={[
          { n: formatKobo(money.grossKobo), l: "Taken", x: `${money.paidOrders} paid orders` },
          { n: formatKobo(money.feesKobo), l: "Our fee" },
          { n: formatKobo(money.netKobo), l: "To organiser", x: "settled T+1" },
          { n: String(money.ticketsSold), l: "Sold", x: `${money.ticketsIssued} issued` },
          { n: String(money.checkedIn), l: "Scanned in" },
        ]}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <p className={label}>Ticket types</p>
          <div className={`${panel} mt-3`}>
            {tiers.length === 0 ? (
              <Empty title="No ticket types" body="Nothing can be sold until one exists." />
            ) : (
              <Scroll>
                <table className="w-full min-w-[520px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Name</th>
                      <th className={`${th} text-right`}>Price</th>
                      <th className={`${th} text-right`}>Sold</th>
                      <th className={`${th} text-right`}>Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((t: any) => (
                      <tr key={t.id}>
                        <td className={td}>{t.name}</td>
                        <td className={tdNum}>{formatKobo(Number(t.price_kobo ?? 0))}</td>
                        <td className={tdNum}>{t.sold_count ?? 0}</td>
                        <td className={tdNum}>{t.quantity ?? "unlimited"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </div>

          <p className={`${label} mt-8`}>Orders</p>
          <div className={`${panel} mt-3`}>
            {orders.length === 0 ? (
              <Empty title="No orders" body="Nobody has bought a ticket to this yet." />
            ) : (
              <Scroll>
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Reference</th>
                      <th className={th}>Buyer</th>
                      <th className={th}>Status</th>
                      <th className={`${th} text-right`}>Qty</th>
                      <th className={`${th} text-right`}>Amount</th>
                      <th className={th}>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 100).map((o: any) => (
                      <tr key={o.id}>
                        <td className={`${td} font-mono text-[12.5px]`}>{o.reference}</td>
                        <td className={td}>
                          <Link
                            href={`/admin/customers?q=${encodeURIComponent(o.buyer_email ?? "")}` as never}
                            className="hover:underline"
                          >
                            {o.buyer_name || o.buyer_email}
                          </Link>
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
            {orders.length > 100 && (
              <p className="border-t-2 border-[var(--dl-line)] px-4 py-3 text-[13px] text-[var(--dl-ink-soft)]">
                Showing the 100 most recent of {orders.length}.
              </p>
            )}
          </div>

          <p className={`${label} mt-8`}>Tickets</p>
          <div className={`${panel} mt-3`}>
            {tickets.length === 0 ? (
              <Empty title="None issued" body="Tickets appear here once a payment settles." />
            ) : (
              <div className="flex flex-wrap gap-2 p-4">
                {tickets.slice(0, 120).map((t: any) => (
                  <span
                    key={t.id}
                    title={`${t.holder_email ?? ""} ${t.checked_in_at ? "· scanned" : ""}`}
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
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <p className={label}>Organiser</p>
            <div className={`${panel} mt-3 p-4`}>
              {organiser ? (
                <Link
                  href={`/admin/organisers/${organiser.id}` as never}
                  className="text-[15px] font-extrabold hover:underline"
                >
                  {organiserName}
                </Link>
              ) : (
                <p className="text-[15px] font-extrabold">{organiserName}</p>
              )}
              {organiser?.account_state && organiser.account_state !== "ok" && (
                <div className="mt-2">
                  <Badge tone={stateTone(organiser.account_state)}>
                    {organiser.account_state}
                  </Badge>
                </div>
              )}
              <Link
                href={`/event/${event.id}` as never}
                className="mt-3 inline-block text-[13px] font-bold underline underline-offset-2"
              >
                View the public page
              </Link>
            </div>
          </div>

          {canAct && (
            <div>
              <p className={label}>Admin actions</p>
              <div className={`${panel} mt-3 p-4`}>
                <StateControl
                  current={event.admin_state ?? "ok"}
                  options={[
                    { value: "ok", label: "Clear" },
                    { value: "flagged", label: "Flag" },
                    { value: "suspended", label: "Suspend", danger: true },
                    { value: "cancelled", label: "Cancel", danger: true },
                  ]}
                  consequence={{
                    flagged: "Marks it for review. Sales continue as normal.",
                    suspended:
                      "Takes it off sale immediately. Existing tickets stay valid — buyers keep what they paid for.",
                    cancelled:
                      "Takes it off sale and marks it cancelled. Refunds are not automatic; that is still a manual job.",
                  }}
                  onApply={async (state, reason) => {
                    "use server";
                    return setEventState(params.id, state as never, reason);
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <p className={label}>Internal notes</p>
            <div className={`${panel} mt-3 p-4`}>
              <NoteBox subjectType="event" subjectId={params.id} notes={notes} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
