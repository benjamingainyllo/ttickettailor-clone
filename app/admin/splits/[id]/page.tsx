import Link from "next/link";
import { notFound } from "next/navigation";
import { getSplitGroupAdmin } from "@/lib/admin-queries";
import { formatKobo } from "@/lib/money";
import {
  panel, label, PageHead, Figures, Badge, stateTone, Empty, Scroll,
  th, td, tdNum, niceDate, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Split group — owner", robots: { index: false, follow: false } };

export default async function AdminSplitPage({ params }: { params: { id: string } }) {
  const detail = await getSplitGroupAdmin(params.id);
  if (!detail) notFound();

  const { group, event, participants, seatsPaid, paidKobo, remainingKobo, expired } = detail;

  return (
    <section>
      <Link href="/admin/splits" className="mb-6 inline-block text-[13px] font-extrabold uppercase tracking-[0.04em]">
        ← Split payments
      </Link>

      <PageHead
        title={group.code}
        sub={event ? event.title : "Event missing"}
        right={
          <div className="flex flex-wrap gap-2">
            <Badge tone={group.status === "complete" ? "ok" : group.status === "open" ? "warn" : "bad"}>
              {group.status}
            </Badge>
            {group.status === "open" && expired && <Badge tone="bad">past deadline</Badge>}
          </div>
        }
      />

      <Figures
        items={[
          { n: `${seatsPaid}/${group.seats}`, l: "Seats paid" },
          { n: formatKobo(Number(group.total_kobo ?? 0)), l: "Total" },
          { n: formatKobo(paidKobo), l: "Collected" },
          { n: formatKobo(remainingKobo), l: "Outstanding" },
          { n: formatKobo(Number(group.unit_price_kobo ?? 0)), l: "Each" },
        ]}
      />

      {group.status === "expired" && paidKobo > 0 && (
        <div className="mt-4 rounded-[3px] border-2 border-[var(--dl-danger)] bg-[#FFF1F3] px-4 py-3.5">
          <p className="text-[14px] leading-relaxed">
            <strong>This group expired with {formatKobo(paidKobo)} collected.</strong> Everybody
            who paid bought nothing — refund each of their orders below. Refunding is deliberately
            not automatic: money leaving on a timer with nobody watching is how it goes wrong quietly.
          </p>
        </div>
      )}

      <p className={`${label} mt-8`}>Who&apos;s in it</p>
      <div className={`${panel} mt-3`}>
        {participants.length === 0 ? (
          <Empty title="Nobody yet" body="The group was created but nobody has joined." />
        ) : (
          <Scroll>
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Person</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Share</th>
                  <th className={th}>Order</th>
                  <th className={th}>Paid</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p: any) => (
                  <tr key={p.id}>
                    <td className={td}>
                      <span className="font-extrabold">{p.name || "—"}</span>
                      <Link href={`/admin/customers?email=${encodeURIComponent(p.email)}` as never} className="block text-[12.5px] text-[var(--dl-ink-soft)] hover:underline">
                        {p.email}
                      </Link>
                    </td>
                    <td className={td}><Badge tone={stateTone(p.status)}>{p.status}</Badge></td>
                    <td className={tdNum}>{formatKobo(Number(p.amount_kobo ?? 0))}</td>
                    <td className={td}>
                      {p.order ? (
                        <Link href={`/admin/orders/${p.order.id}` as never} className="font-mono text-[12.5px] font-bold hover:underline">
                          {p.order.reference}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className={td}>{p.paid_at ? niceDateTime(p.paid_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className={`${panel} p-4 text-[14px]`}>
          <p className={label}>Started by</p>
          <p className="mt-2 font-extrabold">{group.initiator_name || "—"}</p>
          <p className="text-[13.5px] text-[var(--dl-ink-soft)]">{group.initiator_email}</p>
          <p className="mt-2 text-[13px] text-[var(--dl-ink-soft)]">
            Created {niceDateTime(group.created_at)}
          </p>
        </div>
        <div className={`${panel} p-4 text-[14px]`}>
          <p className={label}>Event</p>
          {event ? (
            <>
              <Link href={`/admin/events/${event.id}` as never} className="mt-2 block font-extrabold hover:underline">
                {event.title}
              </Link>
              <p className="text-[13.5px] text-[var(--dl-ink-soft)]">
                {[niceDate(event.date), event.location].filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[var(--dl-ink-soft)]">The event has been deleted.</p>
          )}
          <p className="mt-2 text-[13px] text-[var(--dl-ink-soft)]">
            Deadline {niceDateTime(group.expires_at)}
          </p>
        </div>
      </div>
    </section>
  );
}
