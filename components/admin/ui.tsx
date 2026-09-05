import Link from "next/link";
import { TrendChip } from "@/components/charts/figures";
import type { Trend } from "@/lib/dashboard-shape";

/**
 * The furniture every admin list is built from.
 *
 * Extracted so that "what an empty table looks like" and "what a status
 * badge looks like" are decided once. Seven screens each inventing their
 * own is how an internal tool starts to feel like seven tools.
 */

export const panel = "rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]";
export const label =
  "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";

/**
 * A screen's label in a console, not a headline on a page.
 *
 * These were 38px display type, which is right for a page somebody reads
 * and wrong for the twentieth screen of a tool somebody works in: it
 * pushed the table — the reason the screen exists — down past the fold,
 * and made every internal list read like an article about itself.
 */
export function PageHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]">{title}</h1>
        {sub && <p className="text-[13px] text-[var(--dl-ink-soft)]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/**
 * Numbers in a single ruled block.
 *
 * DELIBERATELY NOT THE SPARKLINE TILES the organiser's dashboard uses. An
 * organiser opens their dashboard to see how they are doing, and a shape
 * answers that. An owner opens the console to run the platform, and a row
 * of chart cards above the work pushes the work below the fold — which is
 * how an operations tool starts reading as a report about itself. The
 * delta stays, because a fee total with no direction still says nothing;
 * the picture goes.
 */
export function Figures({
  items,
}: {
  items: { n: string; l: string; x?: string; t?: Trend; invert?: boolean }[];
}) {
  // The wrapper is shifted up and left by the rule width so the outer
  // edges of the first row and first column tuck under the panel's own
  // border. Without it, a strip that wraps to a second row shows a stray
  // rule hanging off the left of the first cell in that row — which is
  // exactly what five figures did on a phone.
  return (
    <div className={`${panel} overflow-hidden`}>
      <div className="-ml-[2px] -mt-[2px] flex flex-wrap">
      {items.map((f) => (
        <div
          key={f.l}
          className="min-w-[148px] flex-1 border-l-2 border-t-2 border-[var(--dl-line)] px-5 py-3.5"
        >
          <p className={label}>{f.l}</p>
          <p className="mt-1.5 text-[24px] font-extrabold leading-none tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
            {f.n}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {f.t && <TrendChip trend={f.t} invert={f.invert} />}
            {f.x && <span className="text-[12px] text-[var(--dl-ink-soft)]">{f.x}</span>}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "flat";

const TONES: Record<Tone, string> = {
  ok: "border-[var(--mint)] bg-[#E4F5EC] text-[var(--mint)]",
  warn: "border-[#8A5A00] bg-[#FFF3D6] text-[#8A5A00]",
  bad: "border-[var(--dl-danger)] bg-[#FFF1F3] text-[var(--dl-danger)]",
  flat: "border-[var(--dl-line-soft)] bg-transparent text-[var(--dl-ink-soft)]",
};

export function Badge({ tone = "flat", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-[2px] border-2 px-2 py-[2px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** State names are decided in one place so two screens can't disagree. */
export function stateTone(state: string): Tone {
  switch (state) {
    case "ok":
    case "paid":
    case "published":
    case "active":
    case "success":
    case "valid":
      return "ok";
    case "flagged":
    case "pending":
    case "restricted":
    case "processing":
      return "warn";
    case "suspended":
    case "cancelled":
    case "failed":
    case "refunded":
    case "void":
      return "bad";
    default:
      return "flat";
  }
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-[16px] font-extrabold tracking-[-0.02em]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
        {body}
      </p>
    </div>
  );
}

/** Wide tables scroll inside themselves; the page never moves sideways. */
export function Scroll({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export const th =
  "border-b-2 border-[var(--dl-line)] px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)] whitespace-nowrap";
export const td = "border-b border-[var(--dl-line-soft)] px-4 py-3 text-[14px] align-top";
export const tdNum = `${td} text-right [font-variant-numeric:tabular-nums] whitespace-nowrap`;

export function Pager({
  page,
  total,
  pageSize,
  base,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  base: string;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, v);
    q.set("page", String(p));
    return `${base}?${q.toString()}`;
  };

  const btn =
    "rounded-[3px] border-2 border-[var(--dl-line)] px-3.5 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em]";

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-[13px] text-[var(--dl-ink-soft)]">
        Page {page} of {pages} · {total.toLocaleString("en-NG")} total
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1) as never} className={btn}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1) as never} className={btn}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

/** A plain GET form. No JavaScript needed to search an admin table. */
export function SearchBar({
  action,
  q,
  placeholder,
  extra,
}: {
  action: string;
  q?: string;
  placeholder: string;
  extra?: React.ReactNode;
}) {
  return (
    <form action={action} className="mb-5 flex flex-wrap items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        className="min-w-[220px] flex-1 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-[var(--dl-ink-faint)]"
      />
      {extra}
      <button
        type="submit"
        className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)]"
      >
        Search
      </button>
    </form>
  );
}

export function FilterSelect({
  name,
  value,
  options,
}: {
  name: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? "all"}
      className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 py-2.5 text-[14px] font-semibold outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function niceDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function niceDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}
