import type { AnnouncementMessage, SendResult, TicketMessage, WhatsAppProvider } from "./types";

/**
 * WhatsApp through Meta's Cloud API.
 *
 * The thing to understand before wiring this up: a business cannot send
 * WhatsApp whatever it likes. A message that starts a conversation — which
 * every ticket delivery does — must use a TEMPLATE that Meta has approved
 * in advance, with the variable parts passed as parameters. Free text is
 * only allowed inside a 24-hour window that the customer opens by messaging
 * first, which is not how buying a ticket works.
 *
 * So the template is named in an environment variable rather than written
 * here, and its body has to match, in this order:
 *
 *   {{1}} the buyer's name        {{2}} the event
 *   {{3}} when it is             {{4}} the link to their tickets
 *
 * A suggested body, which is what to submit to Meta for approval:
 *
 *   Hi {{1}}, you're in. {{2}} — {{3}}.
 *   Your ticket: {{4}}
 *   Show the QR at the door.
 *
 *   Running your own event? See what you'd keep:
 *   https://benjamin-ticket.vercel.app/sell
 *
 * Change the template and this must change with it, which is why the
 * ordering is written down here as well as in the dashboard.
 *
 * THAT LAST LINE IS DELIBERATELY STATIC, not a fifth parameter. Meta
 * approves the body text once; a static line needs no parameter, so it
 * cannot fall out of step with the {{1}}–{{4}} ordering above, and a
 * future edit to it cannot silently shift the ticket link into the wrong
 * slot. The cost is that the URL is literal here and in the Meta
 * dashboard: if the site ever moves, the template has to be resubmitted.
 * lib/growth.ts holds the same line for the demo provider and the email,
 * where it IS built from the live site URL — keep the two in agreement.
 */
export class CloudWhatsAppProvider implements WhatsAppProvider {
  readonly name = "whatsapp-cloud";

  private readonly token = process.env.WHATSAPP_TOKEN!;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  private readonly template = process.env.WHATSAPP_TEMPLATE_NAME || "ticket_delivery";
  /**
   * A SECOND approved template, for telling ticket-holders something
   * changed. Meta will not carry free-form text to someone who hasn't
   * messaged you in 24 hours, so this cannot reuse the ticket template —
   * its parameters are fixed and none of them is "what the organiser
   * wants to say".
   *
   * Submit a body to Meta shaped exactly like this, in this order:
   *
   *   Hi {{1}}, an update about {{2}}:
   *   {{3}}
   *   See the latest: {{4}}
   *
   * Until it is approved and named here, announcements go by email only
   * and the sender reports WhatsApp as unavailable rather than pretending
   * it worked.
   */
  private readonly updateTemplate = process.env.WHATSAPP_UPDATE_TEMPLATE_NAME || "";
  private readonly locale = process.env.WHATSAPP_TEMPLATE_LOCALE || "en";

  async sendTickets(message: TicketMessage): Promise<SendResult> {
    const body = {
      messaging_product: "whatsapp",
      to: message.to,
      type: "template",
      template: {
        name: this.template,
        language: { code: this.locale },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: message.buyerName || "there" },
              { type: "text", text: message.eventTitle },
              { type: "text", text: message.when || "see your ticket" },
              { type: "text", text: message.ticketsUrl },
            ],
          },
        ],
      },
    };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        // Meta buries the useful part; surface it so a failed delivery can
        // actually be diagnosed rather than just logged as "400".
        const detail =
          json?.error?.error_user_msg || json?.error?.message || `HTTP ${res.status}`;
        return { ok: false, error: detail };
      }

      return { ok: true, id: json?.messages?.[0]?.id };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "WhatsApp request failed",
      };
    }
  }

  async sendAnnouncement(message: AnnouncementMessage): Promise<SendResult> {
    // Saying "not configured" is the honest answer. Falling back to the
    // ticket template would deliver a message about tickets to somebody
    // who is being told their event moved.
    if (!this.updateTemplate) {
      return {
        ok: false,
        error:
          "No approved WhatsApp update template. Set WHATSAPP_UPDATE_TEMPLATE_NAME once Meta approves one.",
      };
    }

    const body = {
      messaging_product: "whatsapp",
      to: message.to,
      type: "template",
      template: {
        name: this.updateTemplate,
        language: { code: this.locale },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: message.guestName || "there" },
              { type: "text", text: message.eventTitle },
              { type: "text", text: message.body },
              { type: "text", text: message.eventUrl },
            ],
          },
        ],
      },
    };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          json?.error?.error_user_msg || json?.error?.message || `HTTP ${res.status}`;
        return { ok: false, error: detail };
      }
      return { ok: true, id: json?.messages?.[0]?.id };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "WhatsApp request failed",
      };
    }
  }
}
