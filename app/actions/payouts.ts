"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider, isDemoPaymentMode } from "@/lib/payments";
import {
  DEFAULT_PLATFORM_FEE_TYPE,
  DEFAULT_PLATFORM_FEE_VALUE,
  type PlatformFeeType,
} from "@/lib/money";

/**
 * Payouts here means ONE thing: connecting the creator's own bank account so
 * the provider can settle directly into it.
 *
 * Paylance never holds the money, so there is deliberately no balance,
 * no withdrawal and no transfer anywhere in this file.
 */

/** Whether the app is running without a real payment gateway. */
export async function getPaymentMode() {
  return { demo: isDemoPaymentMode() };
}

export async function getPayoutAccount() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, account: null, settlements: [] };

  const { data: account, error: accountError } = await supabase
    .from("payout_accounts")
    .select("*")
    .eq("creator_id", user.id)
    .maybeSingle();

  // Both errors used to be discarded, which is worse than it sounds: a
  // failed read is indistinguishable from "no account yet", so the page
  // would show the connect form as if nothing were wrong, and connecting
  // would keep failing with no explanation anywhere.
  if (accountError) {
    console.error("Could not read the payout account:", accountError);
    return { success: false as const, account: null, settlements: [] };
  }

  const { data: settlements, error: settlementsError } = await supabase
    .from("settlements")
    .select("*")
    .eq("creator_id", user.id)
    .order("settled_at", { ascending: false })
    .limit(50);

  if (settlementsError) {
    // Not fatal — the bank connection is the part that matters on this
    // page, and it is worth showing even when the history won't load.
    console.error("Could not read settlements:", settlementsError);
  }

  return {
    success: true as const,
    account: account ?? null,
    settlements: settlements ?? [],
  };
}

export async function listBanks() {
  try {
    const banks = await getPaymentProvider().listBanks();
    return { success: true as const, banks };
  } catch (error) {
    console.error("Could not list banks:", error);
    return { success: false as const, banks: [], error: "Could not load the bank list." };
  }
}

/** Confirms the account name before we create anything. */
export async function resolveBankAccount(accountNumber: string, bankCode: string) {
  try {
    const resolved = await getPaymentProvider().resolveAccountNumber(accountNumber, bankCode);
    return { success: true as const, accountName: resolved.accountName };
  } catch (error) {
    console.error("Could not resolve account:", error);
    return {
      success: false as const,
      error: "We couldn't verify that account. Check the number and bank.",
    };
  }
}

export async function connectBankAccount(input: {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  businessName: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "You need to be signed in." };

  const admin = createAdminClient();
  const provider = getPaymentProvider();

  // Read the configured fee before creating anything, so the subaccount is
  // created with the right split from the start.
  const { data: existing } = await admin
    .from("payout_accounts")
    .select("platform_fee_type, platform_fee_value")
    .eq("creator_id", user.id)
    .maybeSingle();

  const feeType = (existing?.platform_fee_type ?? DEFAULT_PLATFORM_FEE_TYPE) as PlatformFeeType;
  const feeValue = existing?.platform_fee_value ?? DEFAULT_PLATFORM_FEE_VALUE;

  // The subaccount's standing percentage is only a fallback: every checkout
  // sends an explicit per-transaction charge. On the flat-fee model that
  // fallback must be 0, or a transaction that somehow arrived without one
  // would quietly take a percentage of the creator's revenue.
  const platformFeeBps = feeType === "percentage" ? feeValue : 0;

  try {
    const resolved = await provider.resolveAccountNumber(input.accountNumber, input.bankCode);

    const subaccount = await provider.createSubaccount({
      businessName: input.businessName || resolved.accountName,
      bankCode: input.bankCode,
      accountNumber: input.accountNumber,
      platformFeeBps,
    });

    if (!subaccount.providerSubaccountId) {
      return { success: false as const, error: "The payment provider didn't return an account." };
    }

    const { error } = await admin.from("payout_accounts").upsert(
      {
        creator_id: user.id,
        provider: provider.name,
        provider_subaccount_id: subaccount.providerSubaccountId,
        bank_code: input.bankCode,
        bank_name: input.bankName,
        account_name: subaccount.accountName ?? resolved.accountName,
        // Only the last 4 digits are kept — the full number stays with
        // the payment provider.
        account_number_last4: input.accountNumber.slice(-4),
        status: "active",
        platform_fee_type: feeType,
        platform_fee_value: feeValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "creator_id" }
    );

    if (error) return { success: false as const, error: error.message };

    revalidatePath("/payouts");
    revalidatePath("/events");
    return { success: true as const };
  } catch (error) {
    console.error("Bank connection failed:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not connect that account.",
    };
  }
}
