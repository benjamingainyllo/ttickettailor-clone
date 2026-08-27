import type { EmailMessage, EmailProvider, SendEmailResult } from "./types";

/**
 * The demo-mode email provider: logs instead of sending.
 *
 * This is the counterpart to `lib/payments/mock.ts`. With no email key
 * configured the whole ticket flow still runs end to end — the order
 * settles, tickets are issued, and the message that WOULD have been sent
 * is printed to the server console with the ticket link in it, so a
 * developer can follow the link and see the real ticket page.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage): Promise<SendEmailResult> {
    console.log(
      [
        "",
        "──────────── email (demo mode — not sent) ────────────",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "──────────────────────────────────────────────────────",
        "",
      ].join("\n")
    );

    return { ok: true, providerMessageId: null };
  }
}
