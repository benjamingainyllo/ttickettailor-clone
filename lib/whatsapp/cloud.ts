import type { SendResult, TicketMessage, WhatsAppProvider } from "./types";

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
 * Change the template and this must change with it, which is why the
 * ordering is written down here as well as in the dashboard.
 */
export class CloudWhatsAppProvider implements WhatsAppProvider {
  readonly name = "whatsapp-cloud";

  private readonly token = process.env.WHATSAPP_TOKEN!;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  private readonly template = process.env.WHATSAPP_TEMPLATE_NAME || "ticket_delivery";
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
}
