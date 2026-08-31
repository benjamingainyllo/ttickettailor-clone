import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { normaliseReferralCode } from "@/lib/referral-code";

/**
 * The referral offer: bring another organiser, and you both get your next
 * event free.
 *
 * The rules live in setup.sql (PART 7) as constraints, not just as the
 * code below — one referrer per person, nobody refers themselves, and one
 * credit per side per referral. This file is allowed to be wrong; the
 * database is not.
 *
 * Everything here runs with the service key, so it is server-only.
 */

export {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  normaliseReferralCode,
} from "@/lib/referral-code";

export function referralLink(code: string): string {
  return `${siteUrl()}/sell?ref=${encodeURIComponent(code)}`;
}

/**
 * Attribute a brand-new organiser to whoever's link they arrived on.
 *
 * Called once, just after they sign in for the first time. Every way this
 * can be abused is refused rather than reported: an unknown code, their
 * own code, or an account that already has a referrer all end the same
 * way — nothing happens, and the signup carries on regardless. A referral
 * is never worth failing somebody's first login over.
 */
export async function recordReferral(userId: string, rawCode: string | null) {
  const code = normaliseReferralCode(rawCode);
  if (!code) return { recorded: false as const };

  const admin = createAdminClient();

  try {
    const { data: referrer } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();

    if (!referrer || referrer.id === userId) return { recorded: false as const };

    // referred_id is UNIQUE, so a second attempt for the same person is
    // rejected by the database rather than by a check that could race.
    const { error } = await admin
      .from("referrals")
      .insert({ referrer_id: referrer.id, referred_id: userId, code_used: code });

    if (error) return { recorded: false as const };
    return { recorded: true as const, referrerId: referrer.id };
  } catch (error) {
    console.error("Could not record referral", error);
    return { recorded: false as const };
  }
}

/**
 * Pay the offer out, if this organiser has just earned it.
 *
 * Called after every settled PAID order. The credit is deliberately not
 * granted at signup: paying on signup pays for empty accounts, and an
 * offer that can be farmed is a cost centre rather than a growth
 * mechanic. It is granted the first time the referred organiser actually
 * sells something.
 *
 * Safe to call on every order forever. Once the referral is 'earned' the
 * first query finds nothing, and even if two orders settle at the same
 * instant the unique index on (referral_id, reason) means only one of
 * them can create each credit.
 */
export async function awardReferralCredits(referredId: string) {
  if (!referredId) return;

  const admin = createAdminClient();

  try {
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id, referred_id, status")
      .eq("referred_id", referredId)
      .eq("status", "pending")
      .maybeSingle();

    if (!referral) return;

    // Credits first, then the status. If this dies in between, the next
    // settled order retries: the credits are protected from duplication by
    // the unique index, so a retry costs nothing. Flipping the status
    // first would have the opposite failure — a referral marked paid that
    // never paid.
    const { error: creditError } = await admin.from("referral_credits").insert([
      { creator_id: referral.referrer_id, referral_id: referral.id, reason: "referred_someone" },
      { creator_id: referral.referred_id, referral_id: referral.id, reason: "was_referred" },
    ]);

    // A duplicate here means a concurrent caller already granted them,
    // which is the system working. Anything else is worth knowing about.
    if (creditError && creditError.code !== "23505") {
      console.error("Could not grant referral credits", creditError);
      return;
    }

    await admin
      .from("referrals")
      .update({ status: "earned", earned_at: new Date().toISOString() })
      .eq("id", referral.id)
      .eq("status", "pending");
  } catch (error) {
    console.error("Referral award failed", error);
  }
}

export interface ReferralCredit {
  id: string;
  reason: "referred_someone" | "was_referred";
  status: "available" | "applied";
  eventId: string | null;
  eventTitle: string | null;
}

export interface ReferralSummary {
  code: string | null;
  link: string | null;
  /** People who signed up on your link but haven't sold a ticket yet. */
  pending: number;
  /** People who signed up on your link and have. */
  earned: number;
  credits: ReferralCredit[];
  availableCount: number;
}

export async function getReferralSummary(userId: string): Promise<ReferralSummary> {
  const admin = createAdminClient();

  const [profile, referrals, credits] = await Promise.all([
    admin.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
    admin.from("referrals").select("status").eq("referrer_id", userId),
    admin
      .from("referral_credits")
      .select("id, reason, status, event_id")
      .eq("creator_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const code = profile.data?.referral_code ?? null;
  const referralRows = referrals.data ?? [];
  const creditRows = credits.data ?? [];

  // One lookup for every event a credit has been spent on, rather than one
  // per credit. Usually zero or one.
  const eventIds = creditRows.map((c) => c.event_id).filter(Boolean) as string[];
  const titles = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: events } = await admin
      .from("events")
      .select("id, title")
      .in("id", eventIds);
    for (const e of events ?? []) titles.set(e.id, e.title);
  }

  const mapped: ReferralCredit[] = creditRows.map((c) => ({
    id: c.id,
    reason: c.reason,
    status: c.status,
    eventId: c.event_id,
    eventTitle: c.event_id ? (titles.get(c.event_id) ?? null) : null,
  }));

  return {
    code,
    link: code ? referralLink(code) : null,
    pending: referralRows.filter((r) => r.status === "pending").length,
    earned: referralRows.filter((r) => r.status === "earned").length,
    credits: mapped,
    availableCount: mapped.filter((c) => c.status === "available").length,
  };
}
