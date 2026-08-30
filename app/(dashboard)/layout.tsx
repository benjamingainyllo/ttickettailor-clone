import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { AuthGuard } from "@/components/auth/auth-guard";

/**
 * The dashboard shell.
 *
 * `.lp` is what puts the brand palette in scope. It carries the warm
 * near-black ground, the plum raised surfaces and the coral accent, and it
 * also repoints the older --background / --surface / --subtle variables
 * these screens are written against — so the pages inside come out on brand
 * without each one being rewritten. See the block in globals.css.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="lp flex h-screen flex-col overflow-hidden bg-[var(--ground)] font-[family-name:var(--font-bricolage-grotesque)] text-[var(--on-ground)] lg:flex-row">
        <MobileHeader />
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
