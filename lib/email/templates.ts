import { formatKobo, type Kobo } from "@/lib/money";
import { orderTicketsUrl, ticketUrl } from "@/lib/site";
import { ticketFooterHtml, ticketFooterLine } from "@/lib/growth";
import type { EmailMessage } from "./types";

/**
 * The one email that matters: the buyer's tickets.
 *
 * Deliberately links to the ticket page rather than embedding the QR as
 * an image. Most mail clients block data-URI images and many strip
 * remote ones until the reader opts in — a QR that renders as a broken
 * icon at the door is worse than no QR at all. The code is printed in
 * the email as the fallback, and the link opens the scannable version.
 */

export interface TicketEmailInput {
  buyerName: string | null;
  buyerEmail: string;
  eventTitle: string;
  eventDate: string | null;
  eventTime: string | null;
  eventLocation: string | null;
  organiserName: string | null;
  orderReference: string;
  totalKobo: Kobo;
  tickets: Array<{
    code: string;
    seat_index: number;
    ticket_type_name: string | null;
  }>;
}

export function ticketConfirmationEmail(input: TicketEmailInput): EmailMessage {
  const count = input.tickets.length;
  const greeting = input.buyerName ? `Hi ${input.buyerName},` : "Hi,";
  const noun = count === 1 ? "ticket" : "tickets";
  const allTicketsLink = orderTicketsUrl(input.orderReference);

  const whenParts = [input.eventDate, input.eventTime].filter(Boolean);
  const when = whenParts.length ? whenParts.join(" at ") : null;

  const detailLines = [
    when ? `When:  ${when}` : null,
    input.eventLocation ? `Where: ${input.eventLocation}` : null,
  ].filter(Boolean) as string[];

  const text = [
    greeting,
    "",
    `Your ${noun} for ${input.eventTitle} ${count === 1 ? "is" : "are"} confirmed.`,
    "",
    ...detailLines,
    "",
    `${count} ${noun} — ${input.totalKobo === 0 ? "Free" : formatKobo(input.totalKobo)}`,
    "",
    ...input.tickets.map(
      (t) =>
        `  ${t.ticket_type_name ?? "Admission"} · ${t.code}\n  ${ticketUrl(t.code)}`
    ),
    "",
    `Show the QR code on your ticket page at the door:`,
    allTicketsLink,
    "",
    input.organiserName ? `See you there,\n${input.organiserName}` : "See you there.",
    "",
    `Order reference: ${input.orderReference}`,
    "",
    // Last line of the whole email, below the order reference: a buyer
    // hunting for their ticket never has to read past it.
    ticketFooterLine(),
  ].join("\n");

  const ticketRows = input.tickets
    .map(
      (t) => `
      <tr>
        <td style="padding:16px;border:1px solid #e4e4e7;border-radius:12px;background:#fafafa;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#71717a;">
            ${escapeHtml(t.ticket_type_name ?? "Admission")}${
              count > 1 ? ` · ${t.seat_index} of ${count}` : ""
            }
          </div>
          <div style="margin-top:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;font-weight:700;letter-spacing:.08em;color:#18181b;">
            ${escapeHtml(t.code)}
          </div>
          <a href="${ticketUrl(t.code)}"
             style="display:inline-block;margin-top:12px;font-size:13px;font-weight:600;color:#E0512F;text-decoration:none;">
            Open ticket &amp; QR code &rarr;
          </a>
        </td>
      </tr>
      <tr><td style="height:10px;line-height:10px;">&nbsp;</td></tr>`
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <div style="font-size:13px;font-weight:700;color:#E0512F;letter-spacing:.04em;">PAYLANCE</div>
                <h1 style="margin:16px 0 4px;font-size:24px;line-height:1.25;font-weight:800;">
                  You're going to ${escapeHtml(input.eventTitle)}
                </h1>
                <p style="margin:0 0 24px;font-size:15px;color:#52525b;">
                  ${escapeHtml(greeting)} your ${noun} ${count === 1 ? "is" : "are"} confirmed.
                </p>

                ${
                  detailLines.length
                    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-left:3px solid #E0512F;padding-left:14px;">
                        ${when ? `<tr><td style="padding:2px 0;font-size:14px;color:#3f3f46;"><strong>When</strong>&nbsp;&nbsp;${escapeHtml(when)}</td></tr>` : ""}
                        ${input.eventLocation ? `<tr><td style="padding:2px 0;font-size:14px;color:#3f3f46;"><strong>Where</strong>&nbsp;&nbsp;${escapeHtml(input.eventLocation)}</td></tr>` : ""}
                      </table>`
                    : ""
                }

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${ticketRows}
                </table>

                <a href="${allTicketsLink}"
                   style="display:block;margin-top:8px;padding:14px;background:#1B1512;color:#ffffff;border-radius:12px;text-align:center;font-size:14px;font-weight:700;text-decoration:none;">
                  Show ${count === 1 ? "my ticket" : "all my tickets"}
                </a>

                <p style="margin:20px 0 0;font-size:13px;color:#71717a;line-height:1.6;">
                  Open that link at the door and we'll scan the QR code. No app,
                  no printing — your phone is the ticket.
                </p>

                <hr style="margin:24px 0;border:none;border-top:1px solid #e4e4e7;" />
                <p style="margin:0;font-size:12px;color:#a1a1aa;">
                  ${count} ${noun} · ${input.totalKobo === 0 ? "Free" : escapeHtml(formatKobo(input.totalKobo))}
                  · Order ${escapeHtml(input.orderReference)}
                </p>
                <p style="margin:10px 0 0;font-size:12px;color:#a1a1aa;">
                  ${ticketFooterHtml()}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    to: input.buyerEmail,
    subject: `Your ${noun} for ${input.eventTitle}`,
    html,
    text,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
