import { redirect } from "next/navigation";

/**
 * /analytics used to point at /experiments, which no longer exists.
 *
 * Sales is where the numbers actually are, so the old link lands there
 * rather than on a 404 — bookmarks and any link already sent out keep
 * working.
 */
export default function AnalyticsPage() {
  redirect("/revenue");
}
