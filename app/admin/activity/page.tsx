import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminIdentity } from "@/lib/admin";
import { notFound } from "next/navigation";
import { panel, PageHead, Empty, Pager, niceDateTime } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity — owner", robots: { index: false, follow: false } };

const PAGE = 50;

/**
 * Everything an admin has changed, newest first.
 *
 * Every admin can read this, including support. That is on purpose: an
 * audit trail only one person can see is a trail nobody checks. It cannot
 * be edited or deleted from anywhere in this interface — the table has no
 * write policy at all, and the actions that append to it use the service
 * role.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();

  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const from = (page - 1) * PAGE;

  const db = createAdminClient();
  let rows: any[] = [];
  let total = 0;
  let missing = false;

  try {
    const { data, count, error } = await db
      .from("admin_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) missing = true;
    rows = data ?? [];
    total = count ?? 0;
  } catch {
    missing = true;
  }

  return (
    <section>
      <PageHead
        title="Activity log"
        sub="Every change an admin has made. Cannot be edited or deleted from here."
      />

      <div className={panel}>
        {missing ? (
          <Empty
            title="Not set up yet"
            body="Run setup.sql in Supabase and this starts recording from the next admin action."
          />
        ) : rows.length === 0 ? (
          <Empty title="Nothing yet" body="No admin has changed anything so far." />
        ) : (
          rows.map((r, i) => (
            <div
              key={r.id}
              className={`px-5 py-4 ${i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-mono text-[13px] font-semibold">{r.action}</p>
                <p className="text-[12.5px] text-[var(--dl-ink-soft)]">
                  {niceDateTime(r.created_at)}
                </p>
              </div>
              <p className="mt-1 text-[14px]">
                <span className="font-bold">{r.admin_email ?? "an admin"}</span>
                {" · "}
                {r.subject_type}
                {r.subject_label ? ` — ${r.subject_label}` : ""}
              </p>
              {r.reason && (
                <p className="mt-1 text-[13.5px] italic text-[var(--dl-ink-soft)]">
                  &ldquo;{r.reason}&rdquo;
                </p>
              )}
              {(r.previous_value || r.new_value) && (
                <p className="mt-1.5 font-mono text-[12px] text-[var(--dl-ink-soft)]">
                  {JSON.stringify(r.previous_value)} → {JSON.stringify(r.new_value)}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <Pager page={page} total={total} pageSize={PAGE} base="/admin/activity" />
    </section>
  );
}
