import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { roleCan } from "@/lib/admin-roles";
import { formatKobo } from "@/lib/money";
import { RefundBox } from "@/components/admin/refund-box";
import { NoteBox } from "@/components/admin/note-box";
import { OrderActions } from "@/components/admin/order-actions";
import {
  panel, label, PageHead, Figures, Badge, stateTone, Empty, Scroll,
  th, td, tdNum, niceDate, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order — owner", robots: { index: false, follow: false } };

/**
 * One order, all the way through.
 *
 * Buyer → payment → tickets → check-in → refunds and disputes, on one
 * page. This is the screen somebody opens when a person is on the phone,
 * so everything that answers "what happened to my money" is here and
 * nothing needs a second tab.
 */
export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  const [detail, admin] = await Promise.all([getOrderDetail(params.id), getAdminIdentity()]);
  if (!detail || !admin) notFound();

  const { order, event, organiser, organiserName, tickets, refunds, disputes, notes, refundedKobo, refundableKobo } = detail;
  const canRefund = roleCan(admin.role, "write:money");
  const canSeeMoney = roleCan(admin.role, "read:finance");

  return (
    <section>
      <Link href="/admin/orders" className="mb-6 inline-block text-[13px] font-extrabold uppercase tracking-[0.04em]">
        ← Orders
      </Link>

      <PageHead
        title={order.reference}
        sub={niceDateTime(order.created_at)}
        right={
          <div className="flex flex-wrap gap-2">
            <Badge tone={stateTone(order.status)}>{order.status}</Badge>
            {order.payment_channel && <Badge>{order.payment_channel.replace("_", " ")}</Badge>}
            {disputes.length > 0 && <Badge tone="bad">disputed</Badge>}
          </div>
        }
      />

      {canSeeMoney && (
        <Figures
          items={[
            { n: formatKobo(Number(order.gross_kobo ?? 0)), l: "Buyer paid" },
            { n: formatKobo(Number(order.platform_fee_kobo ?? 0)), l: "Our fee" },
            { n: formatKobo(Number(order.provider_fee_kobo ?? 0)), l: "Bank fee" },
            { n: formatKobo(Number(order.net_kobo ?? 0)), l: "To organiser" },
            ...(refundedKobo > 0 ? [{ n: formatKobo(refundedKobo), l: "Refunded" }] : []),
          ]}
        />
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <p className={label}>Tickets from this order</p>
          <div className={`${panel} mt-3`}>
            {tickets.length === 0 ? (
              <Empty
                title="No tickets issued"
                body={
                  order.status === "paid"
                    ? "Paid, but nothing was delivered. This is the worst state an order can be in."
                    : "Nothing issued — this order was never paid."
                }
              />
            ) : (
              <Scroll>
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Code</th>
                      <th className={th}>Holder</th>
                      <th className={th}>Status</th>
                      <th className={th}>Scanned in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t: any) => (
                      <tr key={t.id}>
                        <td className={`${td} font-mono text-[12.5px] font-bold`}>{t.code}</td>
                        <td className={td}>{t.holder_email ?? "—"}</td>
                        <td className={td}>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone={stateTone(t.status)}>{t.status}</Badge>
                            {t.checked_in_at && <Badge tone="ok">used</Badge>}
                          </div>
                        </td>
                        <td className={td}>{t.checked_in_at ? niceDateTime(t.checked_in_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </div>

          {tickets.some((t: any) => t.checked_in_at) && disputes.length > 0 && (
            <div className="mt-3 rounded-[3px] border-2 border-[var(--mint)] bg-[#E4F5EC] px-4 py-3">
              <p className="text-[13.5px] leading-relaxed">
                <strong>A ticket on this order was scanned at the door.</strong> That is the
                strongest evidence there is against a chargeback — the buyer walked in.
              </p>
            </div>
          )}

          {refunds.length > 0 && (
            <>
              <p className={`${label} mt-8`}>Refunds</p>
              <div className={`${panel} mt-3`}>
                {refunds.map((r: any, i: number) => (
                  <div key={r.id} className={`px-4 py-3 ${i !== 0 ? "border-t border-[var(--dl-line-soft)]" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[15px] font-extrabold [font-variant-numeric:tabular-nums]">
                        {formatKobo(Number(r.amount_kobo ?? 0))}
                      </span>
                      <Badge tone={stateTone(r.status)}>{r.status}</Badge>
                    </div>
                    {r.reason && <p className="mt-1 text-[13.5px] text-[var(--dl-ink-soft)]">{r.reason}</p>}
                    {r.failure_reason && (
                      <p className="mt-1 text-[13px] font-semibold text-[var(--dl-danger)]">{r.failure_reason}</p>
                    )}
                    <p className="mt-1 text-[12px] text-[var(--dl-ink-faint)]">{niceDateTime(r.created_at)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {disputes.length > 0 && (
            <>
              <p className={`${label} mt-8`}>Disputes</p>
              <div className={`${panel} mt-3 border-[var(--dl-danger)]`}>
                {disputes.map((d: any, i: number) => (
                  <div key={d.id} className={`px-4 py-3 ${i !== 0 ? "border-t border-[var(--dl-line-soft)]" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[15px] font-extrabold">{formatKobo(Number(d.amount_kobo ?? 0))}</span>
                      <Badge tone={stateTone(d.status)}>{d.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 text-[13.5px] text-[var(--dl-ink-soft)]">{d.reason ?? "No reason given."}</p>
                    {d.deadline_at && (
                      <p className="mt-1 text-[12.5px] font-bold text-[var(--dl-danger)]">
                        Answer by {niceDateTime(d.deadline_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <p className={label}>Buyer</p>
            <div className={`${panel} mt-3 p-4 text-[14px]`}>
              <p className="font-extrabold">{order.buyer_name ?? "—"}</p>
              {order.buyer_email && (
                <Link href={`/admin/customers?email=${encodeURIComponent(order.buyer_email)}` as never} className="mt-1 block text-[13.5px] underline underline-offset-2">
                  {order.buyer_email}
                </Link>
              )}
              {order.buyer_phone && (
                <p className="mt-0.5 text-[13.5px] text-[var(--dl-ink-soft)]">{order.buyer_phone}</p>
              )}
            </div>
          </div>

          <div>
            <p className={label}>Event</p>
            <div className={`${panel} mt-3 p-4 text-[14px]`}>
              {event ? (
                <>
                  <Link href={`/admin/events/${event.id}` as never} className="font-extrabold hover:underline">
                    {event.title}
                  </Link>
                  <p className="mt-1 text-[13.5px] text-[var(--dl-ink-soft)]">
                    {[niceDate(event.date), event.location].filter(Boolean).join(" · ")}
                  </p>
                </>
              ) : (
                <p className="text-[var(--dl-ink-soft)]">{order.item_title ?? "—"}</p>
              )}
              {organiser && (
                <Link href={`/admin/organisers/${organiser.id}` as never} className="mt-2.5 block text-[13.5px] underline underline-offset-2">
                  {organiserName}
                </Link>
              )}
            </div>
          </div>

          {canRefund && order.status === "paid" && (
            <div>
              <p className={label}>Refund</p>
              <div className={`${panel} mt-3 p-4`}>
                <RefundBox
                  orderId={params.id}
                  refundableKobo={refundableKobo}
                  buyer={order.buyer_name || order.buyer_email || "the buyer"}
                />
              </div>
            </div>
          )}

          <div>
            <p className={label}>Actions</p>
            <div className={`${panel} mt-3 p-4`}>
              <OrderActions orderId={params.id} canResend={order.status === "paid" && tickets.length > 0} />
            </div>
          </div>

          <div>
            <p className={label}>Internal notes</p>
            <div className={`${panel} mt-3 p-4`}>
              <NoteBox subjectType="order" subjectId={params.id} notes={notes} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
