import { MockWhatsAppProvider } from "./mock";
import { CloudWhatsAppProvider } from "./cloud";
import type { WhatsAppProvider } from "./types";

export * from "./types";
export * from "./phone";

let cached: WhatsAppProvider | null = null;

/** Is a real WhatsApp sender configured? */
export function isDemoWhatsAppMode(): boolean {
  return !(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * The active WhatsApp provider.
 *
 * Same shape as payments and email: everything outside this folder goes
 * through here, so demo and live are one code path and switching over is
 * environment variables rather than a change anywhere else.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (!cached) {
    cached = isDemoWhatsAppMode() ? new MockWhatsAppProvider() : new CloudWhatsAppProvider();
  }
  return cached;
}
