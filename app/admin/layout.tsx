import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminIdentity } from "@/lib/admin";
import { AdminSidebar, AdminMobileHeader } from "@/components/admin/admin-sidebar";
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
 *
 * ---
 *
 * THE SHELL IS THE PRODUCT'S SHELL. This was a centred max-w-[1400px]
 * document with the menu as a column inside it, so on any wide screen the
 * whole console floated in the middle with wallpaper down both sides. The
 * organiser dashboard is a full-bleed app: sidebar pinned to the edge,
 * fixed viewport height, main scrolling on its own. This now is too, and
 * the two are the same object rather than two things that happen to share
 * a palette.
 *
 * THE SEARCH BOX IS CHROME, NOT CONTENT. It used to sit inside the page,
 * above the heading, scrolling away the moment you looked at a table. It
 * belongs in a bar that never moves — in a console, "find the thing" is
 * the most-used control on every screen.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();

  return (
    <div className="dl flex h-screen flex-col overflow-hidden font-[family-name:var(--font-bricolage-grotesque)] lg:flex-row">
      <AdminMobileHeader role={admin.role} />
      <AdminSidebar role={admin.role} email={admin.email} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[60px] shrink-0 items-center gap-4 border-b-2 border-[var(--dl-line)] px-5 md:px-7">
          <div className="w-full max-w-[460px]">
            <GlobalSearch />
          </div>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <span className="rounded-[2px] border-2 border-[var(--dl-line)] px-2 py-[2px] text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dl-ink-soft)]">
              {admin.role.replace("_", " ")}
            </span>
            <Link
              href="/overview"
              className="rounded-[3px] border-2 border-[var(--dl-line)] px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-[1px]"
            >
              Your dashboard
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
