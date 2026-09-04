"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailProvider } from "@/lib/email";
import { getWhatsAppProvider } from "@/lib/whatsapp";
import { toE164 } from "@/lib/whatsapp/phone";
import { siteUrl } from "@/lib/site";

/**
 * Telling everyone who holds a ticket that something changed.
 *
 * WHY THIS EXISTS AT ALL. The edit screen warns an organiser that moving
 * a date breaks a promise to people who already paid. A warning with no
 * way to act on it is just guilt, so this is the other half of it.
 *
 * IT IS ALSO CHARGEBACK EVIDENCE. Paystack told us a dispute is won by
 * showing value was provided, and the losing case after a moved event is
 * "nobody told me". Every send is recorded with its date and its counts,
 * which is exactly the thing to attach to a dispute.
 *
 * ADDRESSES NEVER LEAVE THE SERVER. The screen gets a count of people to
 * write to, never the list. There is no reason for a browser to hold a
 * few hundred guests' phone numbers, and every reason for it not to.
 */

/** Ten minutes between blasts, and a hard ceiling per day per event. */
const COOLDOWN_MS = 10 * 60 * 1000;
const MAX_PER_DAY = 5;
const MAX_BODY = 2000;

export interface GuestAudience {
  ok: true;
  eventTitle: string;
  /** People, not orders — one buyer with three tickets is one person. */
  guests: number;
  reachableByEmail: number;
  reachableByWhatsApp: number;
  whatsappConfigured: boolean;
  sentToday: number;
  /** Null when they may send now. */
  waitSeconds: number | null;
  recent: { body: string; created_at: string; recipients_total: number }[];
}

/** One person, however many tickets they bought. */
interface Recipient {
  email: string | null;
  phone: string | null;
  name: string | null;
}

async function loadRecipients(admin: any, eventId: string): Promise<Recipient[]> {
  const { data: orders } = await admin
    .from("orders")
    .select("buyer_email, buyer_phone, buyer_name")
    .eq("event_id", eventId)
    .eq("status", "paid");

  // Deduplicate on email first, then phone. A buyer who ordered three
  // times must be written to once — being told the same thing three times
  // reads as a broken system, not as thoroughness.
  const byKey = new Map<string, Recipient>();
  for (const o of orders ?? []) {
    const email = (o.buyer_email ?? "").trim().toLowerCase() || null;
    const phone = o.buyer_phone ? toE164(o.buyer_phone) : null;
    const key = email ?? phone;
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, { email, phone, name: o.buyer_name ?? null });
    } else {
      // Keep whichever channels we have across their orders.
      const existing = byKey.get(key)!;
      existing.phone = existing.phone ?? phone;
      existing.name = existing.name ?? o.buyer_name ?? null;
    }
  }
  return Array.from(byKey.values());
}

async function ownedEvent(admin: any, eventId: string, userId: string) {
  const { data } = await admin
    .from("events")
    .select("id, title, creator_id, date, time, location")
    .eq("id", eventId)
    .maybeSingle();
  if (!data || data.creator_id !== userId) return null;
  return data;
}

export async function getGuestAudience(
  eventId: string
): Promise<GuestAudience | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const admin = createAdminClient();
  const event = await ownedEvent(admin, eventId, user.id);
  if (!event) return { ok: false as const, error: "That isn't yours." };

  const recipients = await loadRecipients(admin, eventId);

  // Tolerant: PART 10 of setup.sql may not have been run, and not being
  // able to read the history is no reason to block sending.
  let recent: any[] = [];
  try {
    const { data } = await admin
      .from("event_announcements")
      .select("body, created_at, recipients_total")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(5);
    recent = data ?? [];
  } catch {
    recent = [];
  }

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const sentToday = recent.filter(
    (r) => new Date(r.created_at).getTime() > dayAgo
  ).length;

  const lastAt = recent[0] ? new Date(recent[0].created_at).getTime() : 0;
  const since = Date.now() - lastAt;
  const waitSeconds =
    lastAt && since < COOLDOWN_MS ? Math.ceil((COOLDOWN_MS - since) / 1000) : null;

  return {
    ok: true as const,
    eventTitle: event.title,
    guests: recipients.length,
    reachableByEmail: recipients.filter((r) => r.email).length,
    reachableByWhatsApp: recipients.filter((r) => r.phone).length,
    whatsappConfigured: Boolean(process.env.WHATSAPP_UPDATE_TEMPLATE_NAME),
    sentToday,
    waitSeconds,
    recent,
  };
}

export async function notifyGuests(eventId: string, rawBody: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "You need to be signed in." };

  const body = rawBody.trim();
  if (!body) return { success: false as const, error: "Write something first." };
  if (body.length > MAX_BODY) {
    return { success: false as const, error: `Keep it under ${MAX_BODY} characters.` };
  }

  const admin = createAdminClient();
  const event = await ownedEvent(admin, eventId, user.id);
  if (!event) return { success: false as const, error: "That isn't yours." };

  // Rate limits are enforced here, on the server, not by hiding a button.
  try {
    const { data: recent } = await admin
      .from("event_announcements")
      .select("created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(MAX_PER_DAY);

    const rows = recent ?? [];
    if (rows[0]) {
      const since = Date.now() - new Date(rows[0].created_at).getTime();
      if (since < COOLDOWN_MS) {
        return {
          success: false as const,
          error: `You sent one a few minutes ago. Wait ${Math.ceil(
            (COOLDOWN_MS - since) / 60000
          )} more minutes.`,
        };
      }
    }
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (rows.filter((r) => new Date(r.created_at).getTime() > dayAgo).length >= MAX_PER_DAY) {
      return {
        success: false as const,
        error: `That's ${MAX_PER_DAY} messages today already. Try again tomorrow.`,
      };
    }
  } catch {
    // No history table yet. Sending is still allowed; nothing to check.
  }

  const recipients = await loadRecipients(admin, eventId);
  if (recipients.length === 0) {
    return { success: false as const, error: "Nobody has a ticket to this yet." };
  }

  const eventUrl = `${siteUrl()}/event/${eventId}`;
  const email = getEmailProvider();
  const whatsapp = getWhatsAppProvider();
  const whatsappOn = Boolean(process.env.WHATSAPP_UPDATE_TEMPLATE_NAME);

  let emailSent = 0,
    emailFailed = 0,
    waSent = 0,
    waFailed = 0;

  // Sent in small batches. A few hundred at once trips a provider's rate
  // limit and the failures land on the guests at the end of the list,
  // which is both unfair and invisible.
  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (r) => {
        if (r.email) {
          const res = await email
            .send(buildEmail(r, event.title, body, eventUrl))
            .catch(() => ({ ok: false }));
          res.ok ? emailSent++ : emailFailed++;
        }
        if (r.phone && whatsappOn) {
          const res = await whatsapp
            .sendAnnouncement({
              to: r.phone,
              guestName: r.name,
              eventTitle: event.title,
              body,
              eventUrl,
            })
            .catch(() => ({ ok: false }));
          res.ok ? waSent++ : waFailed++;
        }
      })
    );
  }

  // Recorded even when every send failed. A record saying "nothing got
  // through" is worth far more than no record at all.
  try {
    await admin.from("event_announcements").insert({
      event_id: eventId,
      creator_id: user.id,
      body,
      recipients_total: recipients.length,
      email_sent: emailSent,
      email_failed: emailFailed,
      whatsapp_sent: waSent,
      whatsapp_failed: waFailed,
    });
  } catch (error) {
    console.error("Announcement sent but not recorded", error);
  }

  revalidatePath(`/events/${eventId}/message`);

  return {
    success: true as const,
    guests: recipients.length,
    emailSent,
    emailFailed,
    whatsappSent: waSent,
    whatsappFailed: waFailed,
    whatsappSkipped: !whatsappOn,
  };
}

/** Plain, short, and it says which event without the guest having to guess. */
function buildEmail(r: Recipient, title: string, body: string, url: string) {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${safe(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return {
    to: r.email!,
    subject: `Update: ${title}`,
    text: `Hi ${r.name || "there"},\n\nAn update about ${title}:\n\n${body}\n\nThe event page: ${url}\n`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141018;max-width:520px">
  <p style="margin:0 0 14px">Hi ${safe(r.name || "there")},</p>
  <p style="margin:0 0 14px"><strong>An update about ${safe(title)}:</strong></p>
  ${paragraphs}
  <p style="margin:20px 0 0"><a href="${url}" style="color:#141018;font-weight:700">See the event page</a></p>
  <p style="margin:22px 0 0;font-size:12.5px;color:#6C6478">Your ticket is still valid — keep the message it arrived in.</p>
</div>`,
  };
}
