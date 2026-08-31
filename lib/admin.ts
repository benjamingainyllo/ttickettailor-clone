import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The gate on everything the platform owner can see.
 *
 * This is the most dangerous check in the product, because behind it is
 * every organiser's revenue and every buyer's email address. Three
 * decisions matter and none of them are stylistic:
 *
 *   It runs on the server. `import "server-only"` makes that a build error
 *   rather than a review note — pull this into a client component and the
 *   build fails, instead of shipping a check anybody can edit in dev tools.
 *
 *   Membership lives in the database. Adding or removing an admin is a row,
 *   not a deploy.
 *
 *   The session is read with the CALLER's client, so it is their real
 *   cookie being checked. Membership is then read with the service key,
 *   because a non-admin cannot see that table at all — "the read returned
 *   nothing" would otherwise be the right answer for the wrong reason.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // A failed read is not permission. Anything but a row that exists is no.
  if (error) {
    console.error("Could not check platform admin membership:", error);
    return false;
  }

  return Boolean(data);
}
