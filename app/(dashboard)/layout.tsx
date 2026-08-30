import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { AuthGuard } from "@/components/auth/auth-guard";

/**
 * The dashboard shell.
 *
 * `.dl` — Daylight — is what puts the signed-in palette in scope: a pastel
 * wash for the paper and full-ink rules for everything drawn on it. The
 * marketing site stays on `.lp`, the dark world. See both blocks in
 * globals.css for why they differ.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="dl flex h-screen flex-col overflow-hidden font-[family-name:var(--font-bricolage-grotesque)] lg:flex-row">
        <MobileHeader />
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
