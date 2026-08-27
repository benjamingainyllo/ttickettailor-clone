import { Calendar, MapPin, ExternalLink, CheckCircle2, Ban } from "lucide-react";
import { formatKobo } from "@/lib/money";
import type { TicketView } from "@/lib/ticket-lookup";

/**
 * The thing somebody holds up at the door.
 *
 * Built for a phone in bad light: the QR is on a permanently white
 * ground whatever the theme, the code underneath is large enough to read
 * aloud when a scan won't take, and the status is unmissable so door
 * staff can't mistake an already-used ticket for a fresh one.
 */
export function TicketCard({ ticket, qrSvg }: { ticket: TicketView; qrSvg: string }) {
  const used = ticket.status === "checked_in";
  const dead = ticket.status === "void" || ticket.status === "refunded";

  const when = [ticket.event.date, ticket.event.time].filter(Boolean).join(" · ");

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
      <div className="border-b border-dashed border-zinc-700 p-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {ticket.ticketTypeName || "Admission"}
          {ticket.totalOnOrder > 1 && ` · ${ticket.seatIndex} of ${ticket.totalOnOrder}`}
        </p>

        <div className="relative mx-auto mt-4 w-fit">
          <div
            className={`rounded-2xl bg-white p-3 [&>svg]:h-44 [&>svg]:w-44 ${
              used || dead ? "opacity-25" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          {(used || dead) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`-rotate-12 rounded-lg px-4 py-2 text-sm font-black uppercase tracking-wider ${
                  used ? "bg-emerald-500 text-black" : "bg-red-500 text-white"
                }`}
              >
                {used ? "Checked in" : ticket.status === "refunded" ? "Refunded" : "Void"}
              </span>
            </div>
          )}
        </div>

        <p className="mt-4 font-mono text-xl font-bold tracking-[0.15em] text-white">
          {ticket.code}
        </p>

        {used && ticket.checkedInAt && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Admitted {new Date(ticket.checkedInAt).toLocaleString()}
          </p>
        )}
        {dead && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-red-400">
            <Ban className="h-3.5 w-3.5" />
            This ticket is no longer valid.
          </p>
        )}
      </div>

      <div className="space-y-3 p-6">
        <h1 className="text-lg font-bold leading-tight text-white">{ticket.event.title}</h1>

        {when && (
          <div className="flex items-start gap-2 text-sm text-zinc-300">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <span>{when}</span>
          </div>
        )}

        <div className="flex items-start gap-2 text-sm text-zinc-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <span className="min-w-0">
            {ticket.event.location || "Online"}
            {ticket.event.mapLink && (
              <a
                href={ticket.event.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                Map <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 pt-3 text-xs text-zinc-500">
          <span>{ticket.holderName || "Guest"}</span>
          <span>{ticket.priceKobo === 0 ? "Free" : formatKobo(ticket.priceKobo)}</span>
        </div>

        {ticket.organiserName && (
          <p className="text-xs text-zinc-600">Hosted by {ticket.organiserName}</p>
        )}
      </div>
    </div>
  );
}
