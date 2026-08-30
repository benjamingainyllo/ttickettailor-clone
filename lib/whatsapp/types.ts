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

export interface WhatsAppProvider {
  readonly name: string;
  sendTickets(message: TicketMessage): Promise<SendResult>;
}
