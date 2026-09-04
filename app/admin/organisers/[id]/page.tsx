import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganiserDetail } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { roleCan } from "@/lib/admin-roles";
import { setOrganiserState } from "@/app/actions/admin";
import { formatKobo } from "@/lib/money";
import { StateControl } from "@/components/admin/state-control";
import { NoteBox } from "@/components/admin/note-box";
import {
  panel, label, PageHead, Figures, Badge, stateTone, Empty, Scroll,
  th, td, tdNum, niceDate, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organiser — owner", robots: { index: false, follow: false } };

export default async function AdminOrganiserPage({ params }: { params: { id: string } }) {
  const [detail, admin] = await Promise.all([getOrganiserDetail(params.id), getAdminIdentity()]);
  if (!detail || !admin) notFound();

  const { profile, name, events, bank, settlements, money, notes, audit } = detail;
  const canAct = roleCan(admin.role, "write:organiser_state");
  const canSeeMoney = roleCan(admin.role, "read:finance");

  return (
    <section>
      <Link href="/admin/organisers" className="mb-6 inline-block text-[13px] font-extrabold uppercase tracking-[0.04em]">
        ← Organisers
      </Link>

      <PageHead
        title={name}
        sub={profile.handle ? `@${profile.handle}` : undefined}
        right={<Badge tone={stateTone(profile.account_state ?? "ok")}>{profile.account_state ?? "ok"}</Badge>}
      />

      {canSeeMoney ? (
        <Figures
          items={[
            { n: formatKobo(money.grossKobo), l: "Taken", x: `${money.paidOrders} paid orders` },
            { n: formatKobo(money.feesKobo), l: "Our fee from them" },
            { n: String(money.ticketsSold), l: "Tickets sold" },
            { n: String(events.length), l: "Events" },
            {
              n: `${(money.refundRate * 100).toFixed(1)}%`,
              l: "Refund rate",
              x: `${money.refundedOrders} refunded`,
            },
          ]}
        />
      ) : (
        <div className={`${panel} px-5 py-4`}>
          <p className="text-[14px] text-[var(--dl-ink-soft)]">
            Your role can&apos;t see this organiser&apos;s money.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <p className={label}>Their events</p>
          <div className={`${panel} mt-3`}>
            {events.length === 0 ? (
              <Empty title="No events" body="They haven't created anything yet." />
            ) : (
              <Scroll>
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Event</th>
                      <th className={th}>Date</th>
                      <th className={th}>State</th>
                      <th className={th}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e: any) => (
                      <tr key={e.id}>
                        <td className={td}>
                          <Link href={`/admin/events/${e.id}` as never} className="font-extrabold hover:underline">
                            {e.title}
                          </Link>
                        </td>
                        <td className={td}>{niceDate(e.date)}</td>
                        <td className={td}>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone={stateTone(e.publish_status)}>
                              {e.publish_status === "published" ? "Live" : "Draft"}
                            </Badge>
                            {e.admin_state !== "ok" && (
                              <Badge tone={stateTone(e.admin_state)}>{e.admin_state}</Badge>
                            )}
                          </div>
                        </td>
                        <td className={td}>{niceDate(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </div>

          {canSeeMoney && (
            <>
              <p className={`${label} mt-8`}>Settlements</p>
              <div className={`${panel} mt-3`}>
                {settlements.length === 0 ? (
                  <Empty
                    title="Nothing settled yet"
                    body="Paystack settles the day after a sale. These appear as its webhooks arrive."
                  />
                ) : (
                  <Scroll>
                    <table className="w-full min-w-[520px] border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>Reference</th>
                          <th className={`${th} text-right`}>Amount</th>
                          <th className={th}>Status</th>
                          <th className={th}>Settled</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlements.map((s: any, i: number) => (
                          <tr key={i}>
                            <td className={`${td} font-mono text-[12.5px]`}>
                              {s.provider_settlement_id ?? "—"}
                            </td>
                            <td className={tdNum}>{formatKobo(Number(s.amount_kobo ?? 0))}</td>
                            <td className={td}>
                              <Badge tone={stateTone(s.status)}>{s.status}</Badge>
                            </td>
                            <td className={td}>{niceDateTime(s.settled_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Scroll>
                )}
              </div>
            </>
          )}

          {audit.length > 0 && (
            <>
              <p className={`${label} mt-8`}>What admins have done here</p>
              <div className={`${panel} mt-3`}>
                {audit.map((a: any, i: number) => (
                  <div
                    key={i}
                    className={`px-4 py-3 text-[14px] ${i !== 0 ? "border-t border-[var(--dl-line-soft)]" : ""}`}
                  >
                    <p className="font-mono text-[12.5px] font-semibold">{a.action}</p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--dl-ink-soft)]">
                      {a.admin_email ?? "admin"} · {niceDateTime(a.created_at)}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <p className={label}>Payout account</p>
            <div className={`${panel} mt-3 p-4 text-[14px]`}>
              {bank && bank.provider_subaccount_id ? (
                <>
                  <p className="font-extrabold">{bank.account_name ?? "—"}</p>
                  <p className="mt-1 text-[var(--dl-ink-soft)]">
                    {bank.bank_name ?? "—"} ····{bank.account_number_last4 ?? "????"}
                  </p>
                  <div className="mt-2">
                    <Badge tone={stateTone(bank.status)}>{bank.status}</Badge>
                  </div>
                </>
              ) : (
                <p className="text-[var(--dl-ink-soft)]">
                  No bank connected. They cannot publish a paid event.
                </p>
              )}
            </div>
          </div>

          {canAct && (
            <div>
              <p className={label}>Admin actions</p>
              <div className={`${panel} mt-3 p-4`}>
                <StateControl
                  current={profile.account_state ?? "ok"}
                  options={[
                    { value: "ok", label: "Clear" },
                    { value: "flagged", label: "Flag" },
                    { value: "restricted", label: "Restrict", danger: true },
                    { value: "suspended", label: "Suspend", danger: true },
                  ]}
                  consequence={{
                    flagged: "Marks them for review. Nothing changes for them.",
                    restricted: "Marks the account restricted. Existing events keep selling.",
                    suspended:
                      "Pulls EVERY live event of theirs off sale immediately. Tickets already bought stay valid.",
                  }}
                  onApply={async (state, reason) => {
                    "use server";
                    return setOrganiserState(params.id, state as never, reason);
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <p className={label}>Internal notes</p>
            <div className={`${panel} mt-3 p-4`}>
              <NoteBox subjectType="organiser" subjectId={params.id} notes={notes} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
