/**
 * Provider-agnostic email contract.
 *
 * Same shape as `lib/payments/`: nothing outside this folder knows which
 * service actually delivers the mail, so swapping providers is one file
 * and one environment variable.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Always send one — some clients prefer it. */
  text: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  providerMessageId?: string | null;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<SendEmailResult>;
}
