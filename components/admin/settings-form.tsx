"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updatePlatformSettings } from "@/app/actions/admin";
import { parseNairaInput, formatKobo } from "@/lib/money";

export function SettingsForm({ initial }: { initial: any }) {
  const router = useRouter();
  const [cap, setCap] = useState(
    initial ? ((Number(initial.new_organiser_cap_kobo) || 0) / 100).toLocaleString("en-NG") : "0"
  );
  const [days, setDays] = useState(String(initial?.new_organiser_max_days_ahead ?? 0));
  const [hours, setHours] = useState(String(initial?.split_window_hours ?? 48));
  const [signups, setSignups] = useState(Boolean(initial?.signups_open ?? true));
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const capKobo = parseNairaInput(cap);

  const save = async () => {
    if (capKobo === null) {
      toast.error("That cap isn't a number.");
      return;
    }
    setBusy(true);
    try {
      const res = await updatePlatformSettings({
        newOrganiserCapKobo: capKobo,
        newOrganiserMaxDaysAhead: Number(days) || 0,
        splitWindowHours: Number(hours) || 48,
        signupsOpen: signups,
      });
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Saved, and written to the activity log.");
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3.5 py-2.5 text-[15px] font-semibold outline-none";
  const help = "mt-1.5 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]";
  const lbl = "text-[13.5px] font-extrabold";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <label className={lbl} htmlFor="cap">How much a brand-new organiser can sell</label>
        <div className="relative mt-2">
          <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-[var(--dl-ink-faint)]">₦</span>
          <input id="cap" value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" className={`${field} pl-8`} />
        </div>
        <p className={help}>
          Until their first event finishes without a dispute. <strong>0 means no cap.</strong>{" "}
          {capKobo !== null && capKobo > 0 && `Currently ${formatKobo(capKobo)}.`} This is the
          number that turns a runaway fraud into a survivable one.
        </p>
      </div>

      <div>
        <label className={lbl} htmlFor="days">How far ahead an unproven organiser can sell</label>
        <input id="days" value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className={`${field} mt-2`} />
        <p className={help}>
          In days. 0 means no limit. Selling in January for a December event is eleven months of
          exposure, and the dispute window never closes.
        </p>
      </div>

      <div>
        <label className={lbl} htmlFor="hours">How long a split group has to fill up</label>
        <input id="hours" value={hours} onChange={(e) => setHours(e.target.value)} inputMode="numeric" className={`${field} mt-2`} />
        <p className={help}>
          In hours, between 1 and 720. After this, the group expires and anybody who paid needs
          refunding. Longer is friendlier to buyers and holds the organiser&apos;s seats hostage
          for longer.
        </p>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={signups}
            onChange={(e) => setSignups(e.target.checked)}
            className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-[var(--dl-ink)]"
          />
          <span>
            <span className={lbl}>New organiser signups are open</span>
            <span className={`${help} block`}>
              Untick to stop new accounts without a deploy. Existing organisers carry on
              unaffected.
            </span>
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="flex items-center gap-2 self-start rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-ink)] px-5 py-3 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-paper)] disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save settings
      </button>
    </div>
  );
}
