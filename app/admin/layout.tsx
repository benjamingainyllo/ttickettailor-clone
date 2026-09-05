import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminIdentity } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { GlobalSearch } from "@/components/admin/global-search";

/**
 * The gate, at the door of the whole section.
 *
 * Checked here rather than on each page, so a screen added later cannot be
 * left unguarded by forgetting a line. Pages that need MORE than mere
 * membership check their own capability on top of this.
 *
 * notFound() rather than a "not allowed" page, on purpose: somebody who
 * should not be here learns nothing, not even that the route exists.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();

  return (
    <div className="dl min-h-screen font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-8 lg:flex-row lg:gap-10 lg:px-8 lg:py-10">
        <aside className="shrink-0 lg:w-[212px]">
          <Link href="/admin" className="mb-7 block text-[17px] font-extrabold tracking-[-0.03em]">
            Paylance <span className="text-[var(--dl-ink-faint)]">owner</span>
          </Link>
          <AdminNav role={admin.role} email={admin.email} />
        </aside>
        <main className="min-w-0 flex-1">
          {/* One box that finds anything, on every screen. */}
          <div className="mb-7 max-w-[440px]">
            <GlobalSearch />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
