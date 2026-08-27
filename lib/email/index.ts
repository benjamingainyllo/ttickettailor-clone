import { MockEmailProvider } from "./mock";
import { ResendEmailProvider } from "./resend";
import type { EmailProvider } from "./types";

export * from "./types";

let cached: EmailProvider | null = null;

/** Is a real email service configured? */
export function isDemoEmailMode(): boolean {
  return !(process.env.EMAIL_PROVIDER_API_KEY || process.env.RESEND_API_KEY);
}

/**
 * The active email provider. Everything outside this folder goes through
 * this, so demo mode and live delivery are the same code path.
 */
export function getEmailProvider(): EmailProvider {
  if (!cached) {
    cached = isDemoEmailMode() ? new MockEmailProvider() : new ResendEmailProvider();
  }
  return cached;
}
