import { notFound } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin";

/**
 * The gate, at the door of the whole section.
 *
 * Checked here rather than on each page, so a screen added later cannot be
 * left unguarded by forgetting a line.
 *
 * notFound() rather than a "not allowed" page, on purpose: somebody who
 * should not be here learns nothing, not even that the route exists.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isPlatformAdmin())) notFound();

  return (
    <div className="dl min-h-screen font-[family-name:var(--font-bricolage-grotesque)]">
      {children}
    </div>
  );
}
