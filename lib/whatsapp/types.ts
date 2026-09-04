/** One ticket link, as it appears in a message. */
export interface TicketLink {
  code: string;
  url: string;
}

export interface TicketMessage {
  /** E.164, no plus: 2348031234567. Providers want it in this shape. */
  to: string;
  buyerName: string | null;
  eventTitle: string;
  /** Already formatted for a human: "Sat 12 September · 9pm". */
  when: string | null;
  location: string | null;
  orderReference: string;
  /** The page holding every ticket on the order. */
  ticketsUrl: string;
  tickets: TicketLink[];
}

export interface SendResult {
  ok: boolean;
  /** The provider's id for the message, when it gave one. */
  id?: string;
  error?: string;
}

/**
 * A message to somebody who already holds a ticket, because something
 * about the event changed.
 *
 * SEPARATE FROM TicketMessage ON PURPOSE. WhatsApp will not carry a
 * free-form message to a person who hasn't written to you in the last 24
 * hours — it has to be a template Meta approved in advance, and a
 * template's parameters are fixed. So an announcement is its own shape
 * with its own template, not a ticket message with different words.
 */
export interface AnnouncementMessage {
  /** E.164, no plus. */
  to: string;
  guestName: string | null;
  eventTitle: string;
  /** What the organiser wrote. */
  body: string;
  /** Where they can see the event as it now stands. */
  eventUrl: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendTickets(message: TicketMessage): Promise<SendResult>;
  sendAnnouncement(message: AnnouncementMessage): Promise<SendResult>;
}
