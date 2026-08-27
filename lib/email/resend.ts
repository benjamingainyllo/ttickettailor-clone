import type { EmailMessage, EmailProvider, SendEmailResult } from "./types";

/**
 * Resend. Chosen because it needs one key and no domain-verification
 * dance to start testing, but nothing outside this file depends on that
 * — see `lib/email/types.ts`.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  private get apiKey(): string {
    const key = process.env.EMAIL_PROVIDER_API_KEY || process.env.RESEND_API_KEY;
    if (!key) throw new Error("Email provider key is not configured.");
    return key;
  }

  private get from(): string {
    // A verified sender is required in production. The Resend sandbox
    // sender lets a fresh install send to its own address without one.
    return process.env.EMAIL_FROM || "Paylance <onboarding@resend.dev>";
  }

  async send(message: EmailMessage): Promise<SendEmailResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = json?.message || `HTTP ${response.status}`;
        return { ok: false, error: detail };
      }

      return { ok: true, providerMessageId: json?.id ?? null };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Email delivery failed.",
      };
    }
  }
}
