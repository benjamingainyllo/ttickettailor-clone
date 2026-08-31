import { siteUrl } from "@/lib/site";

/**
 * The line that rides along on a delivered ticket.
 *
 * WHY THIS EXISTS. A ticket sold on Paylance lands in somebody's WhatsApp,
 * and WhatsApp messages get forwarded — to the group chat, to the friend
 * who's coming, to the friend who isn't. That message already travels;
 * until now it travelled without saying who sent it. Every forward was
 * reach we were handing away.
 *
 * The buyer is also the best possible lead. They have just watched the
 * product work from the buying side, on a night they were looking forward
 * to. Nothing in the product had ever spoken to them about running their
 * own event.
 *
 * RULES IT HAS TO OBEY.
 *
 *  - It goes AFTER the ticket, never before it. The ticket is what they
 *    asked for; this is not allowed to get in the way of finding it.
 *  - It is one line. A buyer who wants their QR code at a busy door must
 *    not have to scroll past marketing to reach it.
 *  - It says what it is. No fake-personal phrasing, no "you've been
 *    invited" — they are being told a thing exists, once.
 *
 * The copy lives here rather than in each template so the WhatsApp message
 * and the email cannot drift into saying different things.
 */

/** Short on purpose: this gets read in a forwarded chat message. */
export function sellPageUrl(): string {
  return `${siteUrl()}/sell`;
}

/** One line, plain text. For WhatsApp and for the email's text part. */
export function ticketFooterLine(): string {
  return `Running your own event? See what you'd keep: ${sellPageUrl()}`;
}

/** The same offer, for the HTML email. Muted — it is a footnote, not a CTA. */
export function ticketFooterHtml(): string {
  return `<a href="${sellPageUrl()}" style="color:#71717a;text-decoration:underline;">Running your own event? See what you'd keep</a>`;
}
