import { notFound } from "next/navigation";
import { getPlatformSettings } from "@/lib/admin-queries";
import { getAdminIdentity } from "@/lib/admin";
import { roleCan } from "@/lib/admin-roles";
import { SettingsForm } from "@/components/admin/settings-form";
import { panel, PageHead, Empty, niceDateTime } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — owner", robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  const admin = await getAdminIdentity();
  if (!admin || !roleCan(admin.role, "write:admins")) notFound();

  const settings = await getPlatformSettings();

  return (
    <section>
      <PageHead
        title="Settings"
        sub="Platform-wide limits. Every change is written to the activity log."
      />

      <div className={`${panel} p-6`}>
        {settings === null ? (
          <Empty
            title="Not set up yet"
            body="Run setup.sql in Supabase and this page becomes editable."
          />
        ) : (
          <SettingsForm initial={settings} />
        )}
      </div>

      {settings?.updated_at && (
        <p className="mt-3 text-[13px] text-[var(--dl-ink-soft)]">
          Last changed {niceDateTime(settings.updated_at)}.
        </p>
      )}
    </section>
  );
}
