import { Calendar, MapPin, ExternalLink, CheckCircle2, Ban } from "lucide-react";
import { formatKobo } from "@/lib/money";
import type { TicketView } from "@/lib/ticket-lookup";

/**
 * The thing somebody holds up at the door.
 *
 * Built for a phone in bad light, which is why Daylight suits it better
 * than the dark version it replaces: a bright screen is easier for a
 * scanner to read across a metre of dark room, and the QR keeps its own
 * permanently white ground regardless.
 *
 * Shaped like an actual ticket — a stub holding the code, a perforation,
 * then the details. The 2px ink rule and the dashed tear line are the same
 * language as the rest of the product, and they happen to be exactly what
 * a printed ticket looks like.
 *
 * The code under the QR is large and monospaced so it can be read aloud
 * when a scan won't take, and the status stamp is unmissable so door staff
 * can't wave through a ticket that has already been used.
 */
export function TicketCard({ ticket, qrSvg }: { ticket: TicketView; qrSvg: string }) {
  const used = ticket.status === "checked_in";
  const dead = ticket.status === "void" || ticket.status === "refunded";

  const when = [ticket.event.date, ticket.event.time].filter(Boolean).join(" · ");

  return (
    <div className="overflow-hidden rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
      <div className="border-b-2 border-dashed border-[var(--dl-line)] p-6 text-center">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
          {ticket.ticketTypeName || "Admission"}
          {ticket.totalOnOrder > 1 && ` · ${ticket.seatIndex} of ${ticket.totalOnOrder}`}
        </p>

        <div className="relative mx-auto mt-4 w-fit">
          {/* White under the QR is not a theme choice — scanners need the
              contrast, and a tinted ground costs reads. */}
          <div
            className={`rounded-[3px] bg-white p-3 [&>svg]:h-44 [&>svg]:w-44 ${
              used || dead ? "opacity-20" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          {(used || dead) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`-rotate-12 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[13px] font-black uppercase tracking-[0.08em] text-white ${
                  used ? "bg-[var(--mint)]" : "bg-[var(--dl-danger)]"
                }`}
              >
                {used ? "Checked in" : ticket.status === "refunded" ? "Refunded" : "Void"}
              </span>
            </div>
          )}
        </div>

        <p className="mt-4 font-mono text-[21px] font-bold tracking-[0.15em]">
          {ticket.code}
        </p>

        {used && ticket.checkedInAt && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-[var(--mint)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Admitted {new Date(ticket.checkedInAt).toLocaleString()}
          </p>
        )}
        {dead && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-[var(--dl-danger)]">
            <Ban className="h-3.5 w-3.5" />
            This ticket is no longer valid.
          </p>
        )}
      </div>

      <div className="space-y-3 p-6">
        <h1 className="text-[20px] font-extrabold leading-[1.15] tracking-[-0.025em]">
          {ticket.event.title}
        </h1>

        {when && (
          <div className="flex items-start gap-2 text-[14.5px]">
            <Calendar className="mt-[3px] h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{when}</span>
          </div>
        )}

        <div className="flex items-start gap-2 text-[14.5px]">
          <MapPin className="mt-[3px] h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="min-w-0">
            {ticket.event.location || "Online"}
            {ticket.event.mapLink && (
              <a
                href={ticket.event.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-[12.5px] font-bold underline underline-offset-2"
              >
                Map <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between border-t-2 border-[var(--dl-line)] pt-3 text-[12.5px] font-bold">
          <span>{ticket.holderName || "Guest"}</span>
          <span className="[font-variant-numeric:tabular-nums]">
            {ticket.priceKobo === 0 ? "Free" : formatKobo(ticket.priceKobo)}
          </span>
        </div>

        {ticket.organiserName && (
          <p className="text-[12.5px] text-[var(--dl-ink-soft)]">
            Hosted by {ticket.organiserName}
          </p>
        )}
      </div>
    </div>
  );
}
