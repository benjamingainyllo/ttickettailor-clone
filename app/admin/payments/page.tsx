import Link from "next/link";
import { notFound } from "next/navigation";
import { listPayments } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { roleCan } from "@/lib/admin-roles";
import { formatKobo } from "@/lib/money";
import {
  panel, PageHead, Badge, stateTone, Empty, Scroll, th, td, tdNum,
  Pager, FilterSelect, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments — owner", robots: { index: false, follow: false } };

/**
 * Every transaction, traceable to what it bought.
 *
 * Same rows as Orders — a payment and an order are one record here, and
 * inventing a second table would give the same money two sources of
 * truth. The difference is the question: this screen leads with the
 * provider reference, the channel and the fee split, because it is opened
 * when somebody is reconciling money rather than helping a buyer.
 */
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string; channel?: string; from?: string; to?: string };
}) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  if (!roleCan(admin.role, "read:finance")) {
    return (
      <section>
        <PageHead title="Payments" />
        <div className={`${panel} px-5 py-6`}>
          <p className="text-[14.5px]">Your role can&apos;t see the platform&apos;s money.</p>
        </div>
      </section>
    );
  }

  const page = Number(searchParams.page ?? 1) || 1;
  const { rows, total, pageSize } = await listPayments({
    page, q: searchParams.q, status: searchParams.status,
    channel: searchParams.channel, from: searchParams.from, to: searchParams.to,
  });

  const input =
    "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 py-2.5 text-[14px] outline-none [color-scheme:light]";

  return (
    <section>
      <PageHead title="Payments" sub="Every transaction, with what it paid for." />

      <form action="/admin/payments" className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="search" name="q" defaultValue={searchParams.q ?? ""}
          placeholder="Reference or buyer email…"
          className={`${input} min-w-[210px] flex-1`}
        />
        <FilterSelect name="status" value={searchParams.status} options={[
          { value: "all", label: "Any status" },
          { value: "paid", label: "Successful" },
          { value: "pending", label: "Pending" },
          { value: "failed", label: "Failed" },
          { value: "abandoned", label: "Abandoned" },
          { value: "refunded", label: "Refunded" },
        ]} />
        <FilterSelect name="channel" value={searchParams.channel} options={[
          { value: "all", label: "Any channel" },
          { value: "card", label: "Card" },
          { value: "bank_transfer", label: "Transfer" },
          { value: "dedicated_account", label: "Virtual account" },
          { value: "ussd", label: "USSD" },
          { value: "qr", label: "QR" },
        ]} />
        <label className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--dl-ink-faint)]">
          From <input type="date" name="from" defaultValue={searchParams.from ?? ""} className={input} />
        </label>
        <label className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--dl-ink-faint)]">
          To <input type="date" name="to" defaultValue={searchParams.to ?? ""} className={input} />
        </label>
        <button type="submit" className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]">
          Filter
        </button>
      </form>

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty title="No transactions" body="Nothing matches those filters." />
        ) : (
          <Scroll>
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Reference</th>
                  <th className={th}>Provider ref</th>
                  <th className={th}>Buyer</th>
                  <th className={th}>Event</th>
                  <th className={th}>Channel</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Gross</th>
                  <th className={`${th} text-right`}>Our fee</th>
                  <th className={`${th} text-right`}>Bank fee</th>
                  <th className={th}>When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o: any) => (
                  <tr key={o.id} className="hover:bg-black/[0.02]">
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}` as never} className="font-mono text-[12.5px] font-bold hover:underline">
                        {o.reference}
                      </Link>
                      {o.split_group_id && (
                        <span className="mt-1 block"><Badge>split</Badge></span>
                      )}
                    </td>
                    <td className={`${td} font-mono text-[12px] text-[var(--dl-ink-soft)]`}>
                      {o.provider_reference ?? "—"}
                    </td>
                    <td className={td}>
                      {o.buyer_email ? (
                        <Link href={`/admin/customers?email=${encodeURIComponent(o.buyer_email)}` as never} className="hover:underline">
                          {o.buyer_name || o.buyer_email}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className={td}>
                      {o.event_id ? (
                        <Link href={`/admin/events/${o.event_id}` as never} className="hover:underline">{o.eventTitle}</Link>
                      ) : o.eventTitle}
                    </td>
                    <td className={td}>{o.payment_channel?.replace("_", " ") ?? "—"}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={stateTone(o.status)}>{o.status === "paid" ? "successful" : o.status}</Badge>
                        {o.disputed && <Badge tone="bad">disputed</Badge>}
                      </div>
                    </td>
                    <td className={tdNum}>{formatKobo(Number(o.gross_kobo ?? 0))}</td>
                    <td className={tdNum}>{formatKobo(Number(o.platform_fee_kobo ?? 0))}</td>
                    <td className={tdNum}>{formatKobo(Number(o.provider_fee_kobo ?? 0))}</td>
                    <td className={td}>{niceDateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </div>

      <Pager page={page} total={total} pageSize={pageSize} base="/admin/payments"
        params={{ q: searchParams.q, status: searchParams.status, channel: searchParams.channel, from: searchParams.from, to: searchParams.to }} />
    </section>
  );
}
