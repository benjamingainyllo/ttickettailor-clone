import type { AnnouncementMessage, SendResult, TicketMessage, WhatsAppProvider } from "./types";
import { formatE164 } from "./phone";
import { ticketFooterLine } from "@/lib/growth";

/**
 * Demo WhatsApp provider.
 *
 * Used automatically when no WhatsApp account is configured, so the whole
 * flow — collecting a number, settling an order, dispatching tickets — can
 * be built and demonstrated before Meta is involved at all.
 *
 * It sends nothing. It prints what it would have sent, so the message can
 * be read and checked in the server log while the rest of the flow is
 * exercised.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "demo";

  async sendTickets(message: TicketMessage): Promise<SendResult> {
    const lines = [
      "",
      "──────── WHATSAPP (demo — nothing sent) ────────",
      `To:      ${formatE164(message.to)}`,
      `Event:   ${message.eventTitle}`,
      message.when ? `When:    ${message.when}` : null,
      message.location ? `Where:   ${message.location}` : null,
      `Order:   ${message.orderReference}`,
      `Tickets: ${message.ticketsUrl}`,
      ...message.tickets.map((t) => `         ${t.code}  ${t.url}`),
      "",
      // Printed here because on the live provider it is baked into the
      // Meta-approved template body, and this is the only place it can be
      // read back and checked before that template is submitted.
      ticketFooterLine(),
      "────────────────────────────────────────────────",
      "",
    ].filter(Boolean);

    console.log(lines.join("\n"));
    return { ok: true, id: `demo_${message.orderReference}` };
  }

  async sendAnnouncement(message: AnnouncementMessage): Promise<SendResult> {
    console.log(
      [
        "",
        "──────── WHATSAPP UPDATE (demo — nothing sent) ────────",
        `To:     ${formatE164(message.to)}`,
        `Event:  ${message.eventTitle}`,
        `Link:   ${message.eventUrl}`,
        "",
        message.body,
        "───────────────────────────────────────────────────────",
        "",
      ].join("\n")
    );
    return { ok: true, id: `demo-announce-${Date.now()}` };
  }
}
