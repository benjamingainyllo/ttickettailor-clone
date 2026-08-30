"use server";

import { isDemoWhatsAppMode } from "@/lib/whatsapp";
import { isDemoEmailMode } from "@/lib/email";

/**
 * Which channels can actually deliver a ticket right now.
 *
 * Checkout reads this so the form matches reality rather than intent. While
 * WhatsApp is unconfigured, demanding a number would be asking a buyer for
 * something nothing can use — friction with no delivery behind it.
 *
 * The moment the WhatsApp credentials are set, this flips on its own and
 * the checkout copy, the label and the requirement follow. Nothing here has
 * to be remembered or changed by hand later, which is the whole point:
 * copy that has to be updated in step with a config change is copy that
 * ends up lying.
 */
export async function getDeliveryChannels() {
  return {
    whatsapp: !isDemoWhatsAppMode(),
    email: !isDemoEmailMode(),
  };
}
