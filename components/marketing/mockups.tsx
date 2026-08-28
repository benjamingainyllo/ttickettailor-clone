/**
 * Product mockups, built in markup rather than screenshotted.
 *
 * Showing the thing beats describing it, and these stay honest: every number
 * here is obviously illustrative and sits inside a frame that reads as a
 * picture of the product, not a live figure in the reader's account.
 */

export function EventCardMock() {
  return (
    <div className="w-full max-w-[300px] overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-white shadow-[6px_6px_0_var(--block-shadow)]">
      <div className="relative h-28 bg-gradient-to-br from-[#FF6A45] via-[#FF9E7A] to-[#FFDE59]">
        <span className="absolute bottom-3 left-3 rounded-full bg-[var(--ink)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          ₦5,000 / ticket
        </span>
      </div>
      <div className="p-4">
        <p className="text-[15px] font-bold leading-tight text-[var(--ink)]">
          Sunday Listening Party
        </p>
        <p className="mt-1 text-[11px] text-[var(--ink-soft)]">Sat 14 Jun · 6pm · Yaba</p>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-2">
            {["#FFB3C7", "#9BE3C0", "#B7C4FF", "#DDBBF5"].map((c, i) => (
              <span
                key={c}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-[var(--ink)]"
                style={{ background: c }}
              >
                {["A", "K", "T", "M"][i]}
              </span>
            ))}
          </div>
          <span className="text-[11px] font-semibold text-[var(--ink-soft)]">+23 going</span>
        </div>
      </div>
    </div>
  );
}

export function PayoutMock() {
  return (
    <div className="w-full max-w-[300px] rounded-2xl border-2 border-[var(--ink)] bg-white p-5 shadow-[6px_6px_0_var(--block-shadow)]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">
        Settled to your bank
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--ink)]">₦568,025</p>

      <div className="mt-4 space-y-2 border-t-2 border-dashed border-[var(--rule)] pt-4 text-[11px]">
        {[
          ["Gross · 40 tickets", "₦600,000"],
          ["Paylance · ₦450 each", "−₦18,000"],
          ["Processing", "−₦13,975"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-[var(--ink-soft)]">{k}</span>
            <span className="font-semibold text-[var(--ink)]">{v}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#9BE3C0]/40 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-emerald-600" />
        <span className="text-[11px] font-semibold text-[var(--ink)]">
          Paid straight to GTBank ···· 4471
        </span>
      </div>
    </div>
  );
}

export function OrdersMock() {
  const rows = [
    ["Amara O.", "Preset Pack", "₦12,000", "#FFB3C7"],
    ["Tunde B.", "Listening Party", "₦5,000", "#B7C4FF"],
    ["Zainab I.", "1:1 Session", "₦45,000", "#9BE3C0"],
  ];

  return (
    <div className="w-full max-w-[340px] rounded-2xl border-2 border-[var(--ink)] bg-white p-4 shadow-[6px_6px_0_var(--block-shadow)]">
      <div className="flex items-center justify-between px-1 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">
          Orders
        </p>
        <span className="rounded-full bg-[#FFDE59] px-2 py-0.5 text-[9px] font-bold text-[var(--ink)]">
          TODAY
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map(([who, what, amount, tone]) => (
          <div key={who} className="flex items-center gap-3 rounded-xl bg-[var(--paper-deep)] p-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[var(--ink)]"
              style={{ background: tone }}
            >
              {who[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-[var(--ink)]">{who}</p>
              <p className="truncate text-[10px] text-[var(--ink-soft)]">{what}</p>
            </div>
            <span className="shrink-0 text-[12px] font-bold text-[var(--ink)]">{amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LinkMock() {
  return (
    <div className="w-full max-w-[280px] rounded-2xl border-2 border-[var(--ink)] bg-white p-4 shadow-[6px_6px_0_var(--block-shadow)]">
      <div className="flex items-center gap-2 rounded-xl bg-[var(--paper-deep)] px-3 py-2.5">
        <span className="h-2 w-2 rounded-full bg-[#FF6A45]" />
        <span className="truncate text-[12px] font-semibold text-[var(--ink)]">
          paylance.app/amara
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {[
          ["Sunday Listening Party", "Sat 14 Jun", "From ₦5,000", "#B7C4FF"],
          ["Beat Making Workshop", "Sun 22 Jun", "₦15,000", "#FFB3C7"],
          ["Open Mic — Free entry", "Thu 3 Jul", "Free", "#9BE3C0"],
        ].map(([title, when, price, tone]) => (
          <div
            key={title}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--rule)] p-2.5"
          >
            <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: tone }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-[var(--ink)]">{title}</p>
              <p className="truncate text-[9.5px] text-[var(--ink-soft)]">{when}</p>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-[var(--ink)]">{price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


/**
 * The hero object: a ticket with a real QR-looking block.
 *
 * Drawn rather than generated — this is a picture of the product, and a
 * scannable code on a marketing page would be a code pointing nowhere.
 */
export function TicketMock() {
  return (
    <div className="w-full max-w-[290px] overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-white shadow-[6px_6px_0_var(--block-shadow)]">
      <div className="border-b-2 border-dashed border-[var(--rule)] p-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          Early Bird · 1 of 2
        </p>
        <div className="mx-auto mt-3 w-fit rounded-xl bg-[var(--ink)] p-2.5">
          <QrArt />
        </div>
        <p className="mt-3 font-mono text-[15px] font-bold tracking-[0.14em] text-[var(--ink)]">
          PL-7K4M-9XQ2
        </p>
      </div>
      <div className="p-4">
        <p className="text-[14px] font-bold leading-tight text-[var(--ink)]">
          Sunday Listening Party
        </p>
        <p className="mt-1 text-[11px] text-[var(--ink-soft)]">Sat 14 Jun · 6pm · Yaba</p>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--rule)] pt-3">
          <span className="text-[11px] text-[var(--ink-soft)]">Amara Okafor</span>
          <span className="text-[11px] font-bold text-[var(--ink)]">₦5,000</span>
        </div>
      </div>
    </div>
  );
}

/** A QR-like block. Deterministic, so it doesn't shift between renders. */
function QrArt() {
  const cells = 13;
  // A fixed bit pattern beats Math.random(): the server and client render
  // the same thing, so React doesn't complain about a hydration mismatch.
  const filled = (x: number, y: number) => ((x * 7 + y * 11 + x * y * 3) % 5) < 2;
  const finder = (x: number, y: number) =>
    (x < 3 && y < 3) || (x > cells - 4 && y < 3) || (x < 3 && y > cells - 4);

  return (
    <svg viewBox={`0 0 ${cells} ${cells}`} className="h-24 w-24" aria-hidden="true">
      <rect width={cells} height={cells} fill="var(--ink)" />
      {Array.from({ length: cells }).map((_, y) =>
        Array.from({ length: cells }).map((_, x) =>
          finder(x, y) || filled(x, y) ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#FDF8F0" />
          ) : null
        )
      )}
      {/* Punch the finder squares back out so they read as QR eyes. */}
      {[
        [1, 1],
        [cells - 2, 1],
        [1, cells - 2],
      ].map(([x, y]) => (
        <rect key={`eye-${x}-${y}`} x={x - 0.5} y={y - 0.5} width="1" height="1" fill="var(--ink)" />
      ))}
    </svg>
  );
}

/** The door, mid-scan. The one screen an organiser pictures themselves using. */
export function DoorMock() {
  return (
    <div className="w-full max-w-[260px] overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[#0f0f10] p-3 shadow-[6px_6px_0_var(--block-shadow)]">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">Door</span>
        <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-white">
          63<span className="font-normal text-white/50">/210</span>
        </span>
      </div>

      <div className="rounded-xl bg-[#9BE3C0] p-4">
        <p className="text-[19px] font-black leading-none text-[var(--ink)]">Let them in</p>
        <p className="mt-1.5 text-[11px] font-semibold text-[#1B1512]/70">
          Amara Okafor · Early Bird
        </p>
        <p className="mt-2 font-mono text-[11px] font-bold text-[#1B1512]/70">PL-7K4M-9XQ2</p>
      </div>

      <div className="mt-2 rounded-xl bg-[#FFDE59] p-3">
        <p className="text-[13px] font-black leading-none text-[var(--ink)]">Already used</p>
        <p className="mt-1 text-[10px] font-semibold text-[#1B1512]/70">Scanned at 7:14 PM</p>
      </div>
    </div>
  );
}

/** Tiers, as the buyer meets them. */
export function TiersMock() {
  const tiers = [
    ["Early Bird", "₦5,000", "Only 7 left", true],
    ["General", "₦8,000", null, false],
    ["VIP Table", "₦40,000", "Sold out", false],
  ] as const;

  return (
    <div className="w-full max-w-[280px] rounded-2xl border-2 border-[var(--ink)] bg-white p-4 shadow-[6px_6px_0_var(--block-shadow)]">
      <p className="px-1 pb-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)]">
        Choose a ticket
      </p>
      <div className="space-y-2">
        {tiers.map(([name, price, note, selected]) => (
          <div
            key={name}
            className={`flex items-center justify-between gap-2 rounded-xl border-2 p-3 ${
              selected
                ? "border-[var(--coral)] bg-[var(--coral)]/10"
                : "border-[var(--rule)] bg-[var(--paper-deep)]"
            } ${note === "Sold out" ? "opacity-50" : ""}`}
          >
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold text-[var(--ink)]">{name}</span>
              {note && (
                <span
                  className={`block text-[10px] font-semibold ${
                    note === "Sold out" ? "text-[var(--ink-soft)]" : "text-[#B4541F]"
                  }`}
                >
                  {note}
                </span>
              )}
            </span>
            <span
              className={`shrink-0 text-[12.5px] font-bold text-[var(--ink)] ${
                note === "Sold out" ? "line-through" : ""
              }`}
            >
              {price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
