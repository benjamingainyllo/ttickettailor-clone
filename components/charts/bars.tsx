import { formatKobo } from "@/lib/money";
import { TONE_HEX, TONE_TRACK } from "@/lib/tones";

/**
 * The two charts the overview earns.
 *
 * BOTH ARE BARS, AND BOTH ARE HORIZONTAL WHERE THE LABEL IS A NAME. A
 * donut was the obvious thing to copy, but comparing arc lengths is the
 * one thing people are provably bad at, and "VIP" and "Early bird" are
 * words that need room. Bars sit on a common baseline, so the comparison
 * is a length rather than an angle, and the name reads without a legend
 * to cross-reference.
 *
 * Server-rendered SVG and CSS. No chart runtime ships for these.
 */

/**
 * Four hues, in a fixed order, never cycled.
 *
 * It was six. The fifth and sixth were a teal and a magenta invented to
 * fill the slots, and running the palette through the colour-blindness
 * checks failed both: the teal sat between the green and the blue for a
 * deuteranope at 3.9 ΔE — indistinguishable — and read as grey besides.
 * Four passes every check with 20.6 ΔE to spare. So a fifth ticket type
 * does not get a fifth colour: it folds into "Other", which is honest
 * about the fact that nobody can tell six bar colours apart anyway.
 */
const SERIES = [TONE_HEX.money, TONE_HEX.count, TONE_HEX.fee, TONE_HEX.group];
const OTHER = "#8A8296";

export function TicketTypeSplit({
  data,
}: {
  data: { name: string; tickets: number; grossKobo: number }[];
}) {
  const total = data.reduce((s, d) => s + d.tickets, 0);

  // Beyond four, fold the tail into one row rather than invent a colour
  // for it. Kept here rather than at each call site so no screen can
  // quietly ask for eight.
  const ranked = [...data].sort((a, b) => b.tickets - a.tickets);
  const rows =
    ranked.length > 4
      ? [
          ...ranked.slice(0, 3),
          ranked.slice(3).reduce(
            (acc, d) => ({
              name: `Other (${ranked.length - 3})`,
              tickets: acc.tickets + d.tickets,
              grossKobo: acc.grossKobo + d.grossKobo,
            }),
            { name: "Other", tickets: 0, grossKobo: 0 }
          ),
        ]
      : ranked;

  if (total === 0) {
    return (
      <p className="px-5 py-10 text-center text-[14px] text-[var(--dl-ink-soft)]">
        Nothing sold yet, so there is no split to show.
      </p>
    );
  }

  const max = Math.max(...rows.map((d) => d.tickets), 1);

  return (
    <div className="flex flex-col gap-3.5 p-5">
      {rows.map((d, i) => {
        const hue = i < SERIES.length ? SERIES[i] : OTHER;
        const pct = (d.tickets / total) * 100;
        return (
          <div key={d.name}>
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ background: hue }}
                />
                <span className="truncate font-extrabold">{d.name}</span>
              </span>
              <span className="shrink-0 [font-variant-numeric:tabular-nums] text-[var(--dl-ink-soft)]">
                {d.tickets.toLocaleString("en-NG")}
                <span className="ml-2 font-bold text-[var(--dl-ink)]">{pct.toFixed(0)}%</span>
              </span>
            </div>
            <div
              className="mt-1.5 h-2.5 w-full overflow-hidden rounded-[2px]"
              style={{ background: TONE_TRACK.neutral }}
            >
              <div
                className="h-full rounded-[2px]"
                style={{
                  width: `${Math.max(2, (d.tickets / max) * 100)}%`,
                  background: hue,
                }}
              />
            </div>
            <p className="mt-1 text-[12px] text-[var(--dl-ink-faint)]">
              {formatKobo(d.grossKobo)} taken
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * When people buy.
 *
 * Vertical here, because the labels are three letters and the days have a
 * natural order that reads left to right. The busiest bar is inked and the
 * rest are soft, so the answer — "Friday" — is visible without reading
 * numbers.
 */
export function WeekdayBars({ data }: { data: { day: string; tickets: number }[] }) {
  const max = Math.max(...data.map((d) => d.tickets), 1);
  const total = data.reduce((s, d) => s + d.tickets, 0);

  if (total === 0) {
    return (
      <p className="px-5 py-10 text-center text-[14px] text-[var(--dl-ink-soft)]">
        No sales in the last 30 days.
      </p>
    );
  }

  const best = data.reduce((a, b) => (b.tickets > a.tickets ? b : a));

  return (
    <div className="p-5">
      <div className="flex h-[150px] items-end gap-2.5">
        {data.map((d) => {
          const isBest = d.day === best.day && d.tickets > 0;
          return (
            <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-[11.5px] font-extrabold [font-variant-numeric:tabular-nums] text-[var(--dl-ink-soft)]">
                {d.tickets || ""}
              </span>
              <div
                className="w-full rounded-t-[3px]"
                style={{
                  // A floor of 3px so a day with one sale is visibly not
                  // a day with none.
                  height: `${d.tickets > 0 ? Math.max(3, (d.tickets / max) * 110) : 2}px`,
                  // One hue, two steps: the busiest day full strength, the
                  // rest a pale step of the SAME colour. A black winner
                  // against grey losers was the wireframe look, and it also
                  // implied two different kinds of thing where there is
                  // only one — tickets, more or fewer.
                  background: isBest
                    ? TONE_HEX.count
                    : d.tickets > 0
                      ? TONE_TRACK.count
                      : TONE_TRACK.neutral,
                }}
                title={`${d.day}: ${d.tickets} tickets`}
              />
              <span
                className={`text-[11.5px] ${isBest ? "font-extrabold" : "font-semibold text-[var(--dl-ink-soft)]"}`}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 border-t-2 border-[var(--dl-line)] pt-3 text-[13px] text-[var(--dl-ink-soft)]">
        <strong className="text-[var(--dl-ink)]">{best.day}</strong> is the busiest day to sell —{" "}
        {best.tickets} of {total} tickets in the last 30 days.
      </p>
    </div>
  );
}
