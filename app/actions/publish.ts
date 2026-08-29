"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ItemType = "event";

const TABLE: Record<ItemType, { name: string; ownerColumn: string }> = {
  event: { name: "events", ownerColumn: "creator_id" },
};

/**
 * Whether this creator is allowed to publish paid items yet.
 * The UI uses this to explain itself; it is NOT the enforcement point.
 */
export async function getPublishEligibility() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { canPublishPaid: false, reason: "not_signed_in" as const };

  const { data: account } = await supabase
    .from("payout_accounts")
    .select("status, provider_subaccount_id, bank_name, account_number_last4")
    .eq("creator_id", user.id)
    .maybeSingle();

  const canPublishPaid =
    account?.status === "active" && Boolean(account?.provider_subaccount_id);

  return {
    canPublishPaid,
    reason: canPublishPaid ? ("ok" as const) : ("no_payout_account" as const),
    account: account ?? null,
  };
}

/**
 * Publish a sellable item.
 *
 * Enforced in three places on purpose:
 *   1. here, so the user gets a clear message
 *   2. in RLS, so only the owner can touch the row
 *   3. in a database trigger, so a paid item cannot reach 'published'
 *      without an active payout account even if this action is bypassed
 */
export async function publishItem(itemType: ItemType, itemId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "You need to be signed in." };

  const table = TABLE[itemType];
  const admin = createAdminClient();

  const { data: item } = await admin
    .from(table.name)
    .select(`id, price_kobo, ${table.ownerColumn}`)
    .eq("id", itemId)
    .maybeSingle();

  if (!item) return { success: false as const, error: "Item not found." };
  if ((item as any)[table.ownerColumn] !== user.id) {
    return { success: false as const, error: "That isn't yours to publish." };
  }

  const priceKobo = Number((item as any).price_kobo ?? 0);

  if (priceKobo > 0) {
    const eligibility = await getPublishEligibility();
    if (!eligibility.canPublishPaid) {
      return {
        success: false as const,
        error: "Connect your bank account before publishing something you're charging for.",
        reason: "no_payout_account" as const,
      };
    }
  }

  const { error } = await supabase
    .from(table.name)
    .update({ publish_status: "published" })
    .eq("id", itemId);

  if (error) {
    // The trigger raises check_violation if the gate is not satisfied.
    if (error.message?.includes("Connect a bank account")) {
      return {
        success: false as const,
        error: "Connect your bank account before publishing something you're charging for.",
        reason: "no_payout_account" as const,
      };
    }
    return { success: false as const, error: error.message };
  }

  revalidatePath("/events");
  return { success: true as const };
}

export async function unpublishItem(itemType: ItemType, itemId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "You need to be signed in." };

  const table = TABLE[itemType];

  const { error } = await supabase
    .from(table.name)
    .update({ publish_status: "draft" })
    .eq("id", itemId)
    .eq(table.ownerColumn, user.id);

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/events");
  return { success: true as const };
}
