import Link from "next/link";
import { formatKobo } from "@/lib/money";
import type { ExploreEvent } from "@/lib/explore";
import { InterestButton } from "@/components/storefront/interest-button";

/**
 * One event, as a stranger sees it.
 *
 * THE ANATOMY IS THE REFERENCE'S, BECAUSE THE REFERENCE IS RIGHT. Who is
 * putting it on comes FIRST, as a chip with their mark on it — on a
 * discovery page you are choosing a host as much as an event, and burying
 * that as grey text under the title got the order backwards. Then the
 * title, then when and where, then a footer that carries the social proof
 * on the left and the save on the right. The star moved out of the corner
 * of the artwork: a control overlapping a picture is a control people
 * miss, and it belongs with the number it changes.
 *
 * BOTH NUMBERS ARE REAL. "Going" is tickets issued; "interested" is
 * people who tapped the star. Inventing either would be the most damaging
 * thing on this page — someone who turns up to a room of eleven having
 * read "886 interested" never comes back, and nor does the organiser.
 * Zero shows as absence, so a new event reads as new rather than unloved.
 */

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/** "Today", "Tomorrow", then "Sat 12 Sep". Time appended when it is set. */
function whenLabel(date: string | null, time: string | null, now = new Date()): string {
  if (!date) return "Date to be announced";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Date to be announced";

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);

  const day =
    days === 0 ? "Today"
    : days === 1 ? "Tomorrow"
    : days < 7 ? `This ${DAYS[d.getDay()]}`
    : days < 14 ? `Next ${DAYS[d.getDay()]}`
    : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  return time ? `${day} at ${time.replace(/:00\b/, "").toLowerCase()}` : day;
}

/**
 * A poster for an event with no artwork.
 *
 * MOST EVENTS ARRIVE WITHOUT A FLYER, and the reference's page is carried
 * almost entirely by artwork — so what fills that square when there is
 * none decides whether the page looks designed or looks broken. Setting
 * the title in caps inside a box looked like a missing image. This is a
 * deliberate poster instead: two-tone gradient chosen from the event's own
 * id so it is stable between visits, the host's initial set large, and a
 * grain of the title underneath. It reads as a choice, not a gap.
 */
const PAIRS = [
  ["#FF6A45", "#7A1F3D"], ["#DDBBF5", "#2B1B4A"], ["#9BE3C0", "#123A2E"],
  ["#B7C4FF", "#1E2352"], ["#FFDE59", "#5A3B00"], ["#FFB3C7", "#4A1230"],
];
function tintFor(id: string): [string, string] {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) % 997;
  return PAIRS[n % PAIRS.length] as [string, string];
}

function Poster({ event, size }: { event: ExploreEvent; size: "sm" | "lg" }) {
  const [a, b] = tintFor(event.id);
  const initial = (event.hostName || event.title || "P").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl ${
        size === "lg"
          ? "h-[104px] w-[104px] sm:h-[148px] sm:w-[148px]"
          : "h-[84px] w-[84px] sm:h-[92px] sm:w-[92px]"
      }`}
      style={{ background: `linear-gradient(150deg, ${a} 0%, ${b} 100%)` }}
    >
      {event.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <>
          <span
            className={`absolute inset-0 grid place-items-center font-black text-white/90 ${
              size === "lg" ? "text-[54px]" : "text-[34px]"
            }`}
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.28)" }}
            aria-hidden="true"
          >
            {initial}
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-black/30 px-2 py-1 text-center text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/85 backdrop-blur-[2px]">
            <span className="block truncate">{event.title}</span>
          </span>
        </>
      )}

      {event.fromKobo !== null && (
        <span
          className={`absolute left-1.5 top-1.5 rounded-full px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.06em] ${
            event.fromKobo === 0
              ? "bg-[var(--mint)] text-[#0B2B1D]"
              : "bg-black/65 text-white backdrop-blur-[2px]"
          }`}
        >
          {event.fromKobo === 0 ? "Free" : formatKobo(event.fromKobo)}
        </span>
      )}
    </div>
  );
}

export function ExploreCard({
  event,
  size = "sm",
}: {
  event: ExploreEvent;
  /** "lg" when a city has only a couple of events and the column is wide. */
  size?: "sm" | "lg";
}) {
  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-[var(--hairline)] bg-[var(--ground-deep)] transition-colors hover:border-[var(--hairline-firm)] hover:bg-[var(--ground-raised)]">
      <Link href={`/event/${event.id}`} className="flex min-w-0 gap-3.5 p-3.5 sm:gap-4">
        <Poster event={event} size={size} />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* Who is putting it on, first. On a discovery page you are
              picking a host as much as an event. */}
          <span className="flex w-fit max-w-full items-center gap-1.5 rounded-full bg-[var(--ground-raised)] py-[3px] pl-[3px] pr-2">
            <span
              className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full text-[9px] font-black text-white"
              style={{ background: tintFor(event.id)[0] }}
              aria-hidden="true"
            >
              {(event.hostName || "P").charAt(0).toUpperCase()}
            </span>
            <span className="truncate text-[11.5px] font-bold text-[var(--on-ground-soft)]">
              {event.hostName}
            </span>
            <span aria-hidden="true" className="shrink-0 text-[10px] text-[var(--on-ground-faint)]">›</span>
          </span>

          <h3
            className={`line-clamp-2 font-extrabold leading-[1.2] tracking-[-0.015em] text-[var(--on-ground)] ${
              size === "lg" ? "text-[18px] sm:text-[21px]" : "text-[15px]"
            }`}
          >
            {event.title}
          </h3>

          <p className="truncate text-[12.5px] text-[var(--on-ground-soft)]">
            {whenLabel(event.date, event.time)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
      </Link>

      {/* The footer: what other people did, and what you can do. Outside
          the link so the star is a control rather than part of a tap
          target that navigates. */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] px-3.5 py-2">
        <p className="min-w-0 truncate text-[12px] text-[var(--on-ground-faint)]">
          {event.interested > 0 || event.going > 0 ? (
            <>
              {event.interested > 0 && (
                <span className="font-bold text-[var(--on-ground-soft)]">
                  {event.interested.toLocaleString("en-NG")} interested
                </span>
              )}
              {event.interested > 0 && event.going > 0 && " · "}
              {event.going > 0 && `${event.going.toLocaleString("en-NG")} going`}
            </>
          ) : (
            "Be the first"
          )}
        </p>

        <InterestButton
          eventId={event.id}
          initialSaved={event.saved}
          initialCount={event.interested}
        />
      </div>
    </div>
  );
}
