import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminIdentity } from "@/lib/admin";
import { roleCan, ROLE_LABELS, ROLE_BLURBS, type AdminRole } from "@/lib/admin-roles";
import { panel, label, PageHead, Badge, Empty, niceDate } from "@/components/admin/ui";
import { AdminRoleRow } from "@/components/admin/admin-role-row";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin users — owner", robots: { index: false, follow: false } };

/**
 * Who can get in, and what each of them may do.
 *
 * Only a super admin sees this page at all, and the capability is checked
 * here rather than trusted from the sidebar hiding the link.
 *
 * ADDING AN ADMIN IS STILL A SQL STATEMENT, deliberately. Nothing in the
 * product can grant platform-wide access to an account, so no bug and no
 * stolen session can promote anybody. Roles can be adjusted here because
 * that only ever moves someone between levels of access they already had.
 */
export default async function AdminUsersPage() {
  const me = await getAdminIdentity();
  if (!me || !roleCan(me.role, "write:admins")) notFound();

  const db = createAdminClient();
  const { data: admins } = await db
    .from("platform_admins")
    .select("user_id, role, added_at, note")
    .order("added_at", { ascending: true });

  const rows = admins ?? [];

  // Emails live in auth, which the service role can read; without them the
  // page is a list of UUIDs nobody can act on with any confidence.
  const emails = new Map<string, string>();
  await Promise.all(
    rows.map(async (a: any) => {
      try {
        const { data } = await db.auth.admin.getUserById(a.user_id);
        if (data?.user?.email) emails.set(a.user_id, data.user.email);
      } catch {
        /* a missing email is shown as the id, not as a crash */
      }
    })
  );

  return (
    <section>
      <PageHead title="Admin users" sub="Who can see the owner area, and what each of them can do." />

      <div className={panel}>
        {rows.length === 0 ? (
          <Empty title="Nobody" body="That shouldn't be possible — you're reading this." />
        ) : (
          rows.map((a: any, i: number) => (
            <AdminRoleRow
              key={a.user_id}
              userId={a.user_id}
              email={emails.get(a.user_id) ?? a.user_id}
              role={a.role as AdminRole}
              addedAt={niceDate(a.added_at)}
              isSelf={a.user_id === me.userId}
              first={i === 0}
            />
          ))
        )}
      </div>

      <p className={`${label} mt-9`}>What the roles mean</p>
      <div className={`${panel} mt-3`}>
        {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r, i) => (
          <div key={r} className={`px-5 py-3.5 ${i !== 0 ? "border-t border-[var(--dl-line-soft)]" : ""}`}>
            <Badge tone={r === "super_admin" ? "bad" : r === "support" ? "flat" : "warn"}>
              {ROLE_LABELS[r]}
            </Badge>
            <p className="mt-1.5 text-[14px] text-[var(--dl-ink-soft)]">{ROLE_BLURBS[r]}</p>
          </div>
        ))}
      </div>

      <div className={`${panel} mt-6 p-5`}>
        <p className="text-[14px] font-extrabold">Adding somebody new</p>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
          Deliberately not possible from here. Nothing in the product can grant
          platform-wide access to an account, so no bug and no stolen session can
          promote anybody. A new admin is one line in the Supabase SQL editor, and
          their role can then be set on this page.
        </p>
      </div>
    </section>
  );
}
