import Link from "next/link";
import { formatKobo } from "@/lib/money";
import type { ExploreEvent } from "@/lib/explore";

/**
 * One event, as a stranger sees it.
 *
 * WHAT IT DOES NOT SAY IS THE POINT. The page this is modelled on puts an
 * "886 interested" under every card, and we have no interest signal —
 * nobody can save an event on Paylance yet. Inventing one would be the
 * single most damaging thing on a discovery page: a visitor who turns up
 * to a room of eleven people having read "886 interested" never comes
 * back, and neither does the organiser. So the only number here is
 * tickets actually issued, it is called "going", and when it is zero it
 * is absent rather than a zero — a new event reads as new, not as unloved.
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
    : days < 7 ? DAYS[d.getDay()]
    : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  return time ? `${day} · ${time}` : day;
}

/**
 * A cover for an event that has none.
 *
 * Deterministic from the id, so the same event keeps the same colours
 * between visits rather than flickering to a new one on every render.
 */
function fallbackTint(id: string): { a: string; b: string } {
  const PAIRS = [
    { a: "#FF6A45", b: "#241430" },
    { a: "#DDBBF5", b: "#241430" },
    { a: "#9BE3C0", b: "#12080F" },
    { a: "#B7C4FF", b: "#241430" },
    { a: "#FFDE59", b: "#1B0D18" },
    { a: "#FFB3C7", b: "#12080F" },
  ];
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) % 997;
  return PAIRS[n % PAIRS.length];
}

export function ExploreCard({ event }: { event: ExploreEvent }) {
  const tint = fallbackTint(event.id);
  const price =
    event.fromKobo === null ? null : event.fromKobo === 0 ? "Free" : `from ${formatKobo(event.fromKobo)}`;

  return (
    <Link
      href={`/event/${event.id}`}
      className="group flex gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--ground-deep)] p-3 transition-colors hover:border-[var(--hairline-firm)] hover:bg-[var(--ground-raised)]"
    >
      <div
        className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-xl"
        style={{ background: `linear-gradient(140deg, ${tint.a}, ${tint.b})` }}
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
          /* A long word in a 92px box overflows it — "Homecoming" alone is
             wider than the tile at 11px. Wrap anywhere, clamp to three
             lines, and let the title be cut rather than the box burst. */
          <span className="absolute inset-0 grid place-items-center overflow-hidden px-1.5 text-center">
            <span className="line-clamp-3 break-words text-[10px] font-extrabold uppercase leading-[1.15] tracking-[0.06em] text-white/85">
              {event.title}
            </span>
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="truncate text-[11px] font-semibold text-[var(--on-ground-faint)]">
          {event.hostName}
        </p>

        <h3 className="line-clamp-2 text-[14.5px] font-bold leading-[1.25] tracking-[-0.01em] text-[var(--on-ground)]">
          {event.title}
        </h3>

        <p className="truncate text-[12.5px] text-[var(--on-ground-soft)]">
          {whenLabel(event.date, event.time)}
          {event.location ? ` · ${event.location}` : ""}
        </p>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {price && (
            <span
              className={`text-[11.5px] font-extrabold uppercase tracking-[0.06em] ${
                event.fromKobo === 0 ? "text-[var(--mint)]" : "text-[var(--marker)]"
              }`}
            >
              {price}
            </span>
          )}
          {event.going > 0 && (
            <span className="text-[11.5px] text-[var(--on-ground-faint)]">
              {event.going.toLocaleString("en-NG")} going
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
