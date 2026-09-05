"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Landmark, ShieldCheck, Loader2, CheckCircle2, ArrowRight, Info, Inbox, TriangleAlert,
} from "lucide-react";
import { StatTiles } from "@/components/charts/figures";
import { formatKobo } from "@/lib/money";
import {
  connectBankAccount,
  getPaymentMode,
  getPayoutAccount,
  listBanks,
  resolveBankAccount,
} from "@/app/actions/payouts";
import { toast } from "sonner";

/**
 * Payouts = bank connection + read-only settlement history.
 *
 * Paylance never holds creator funds — the payment provider splits at
 * transaction time and settles the creator's share straight to this bank
 * account. That's why there is no balance and nothing to withdraw here.
 */
export default function PayoutsPage() {
  const [account, setAccount] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [sold, setSold] = useState<{ netKobo: number; orders: number; lastSaleAt: string | null }>(
    { netKobo: 0, orders: 0, lastSaleAt: null }
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getPayoutAccount();
      if (!res.success) throw new Error("Could not load payout details");
      setAccount(res.account);
      setSettlements(res.settlements);
      setSold(res.sold);
    } catch (error) {
      console.error(error);
      setLoadError("Couldn't load your payout details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getPaymentMode().then((m) => setDemoMode(m.demo));
  }, [load]);

  const isConnected = account?.status === "active" && account?.provider_subaccount_id;

  useEffect(() => {
    if (isConnected || loading) return;
    listBanks().then((res) => {
      if (res.success) setBanks(res.banks);
    });
  }, [isConnected, loading]);

  // Verify the account name as soon as a full NUBAN is entered.
  useEffect(() => {
    if (accountNumber.length !== 10 || !bankCode) {
      setResolvedName(null);
      return;
    }

    let active = true;
    setResolving(true);
    setResolvedName(null);

    resolveBankAccount(accountNumber, bankCode)
      .then((res) => {
        if (!active) return;
        if (res.success) setResolvedName(res.accountName);
        else toast.error(res.error);
      })
      .finally(() => {
        if (active) setResolving(false);
      });

    return () => {
      active = false;
    };
  }, [accountNumber, bankCode]);

  const handleConnect = async () => {
    if (!resolvedName) return;
    setConnecting(true);
    try {
      const bank = banks.find((b) => b.code === bankCode);
      const res = await connectBankAccount({
        bankCode,
        bankName: bank?.name ?? "",
        accountNumber,
        businessName: resolvedName,
      });

      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Bank account connected. You can publish paid items now.");
      await load();
    } finally {
      setConnecting(false);
    }
  };

  const settled = settlements.filter((s) => s.status === "success");
  const totalSettled = settled.reduce((sum, s) => sum + Number(s.amount_kobo || 0), 0);
  const lastSettlement = settled[0] ?? null;

  // What has been sold but has not landed yet. Clamped at zero: a
  // settlement can legitimately cover an order this page didn't count
  // (an older one, or a correction), and a negative "on its way" would
  // read as money owed rather than as an accounting quirk.
  const onTheWay = Math.max(0, sold.netKobo - totalSettled);

  if (loading) {
    return (
      <section className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-subtle" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[32px] font-extrabold leading-[1] tracking-[-0.04em] sm:text-[40px]">Payouts</h1>
        <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">
          Money from your sales settles straight into your own bank account.
        </p>
      </div>

      <StatTiles
        items={[
          {
            label: "Landed in your bank",
            value: formatKobo(totalSettled),
            note: settled.length > 0
              ? `${settled.length} ${settled.length === 1 ? "payout" : "payouts"}`
              : "nothing yet",
            tone: "money",
          },
          {
            label: "On its way",
            value: formatKobo(onTheWay),
            note: onTheWay > 0 ? "sold, not landed yet" : "nothing outstanding",
            tone: "fee",
          },
          {
            label: "Last payout",
            value: lastSettlement ? formatKobo(Number(lastSettlement.amount_kobo)) : "—",
            note: lastSettlement?.settled_at
              ? new Date(lastSettlement.settled_at).toLocaleDateString("en-NG", {
                  day: "numeric", month: "short", year: "numeric",
                })
              : "no payouts yet",
            tone: "money",
          },
          {
            label: "Bank account",
            value: isConnected ? "Connected" : "Not set up",
            note: isConnected
              ? `${account.bank_name} ····${account.account_number_last4}`
              : "needed before you can sell",
            tone: isConnected ? "count" : "risk",
          },
        ]}
      />

      {loadError && (
        <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-surface p-6 text-center">
          <p className="text-sm text-text">{loadError}</p>
          <button
            onClick={load}
            className="mt-3 rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-2 text-xs font-medium text-text"
          >
            Retry
          </button>
        </div>
      )}

      {demoMode && (
        <div className="flex items-start gap-3 rounded-[3px] border border-[#FFDE594c] bg-[#FFDE591a] p-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--marker)]" />
          <div>
            <p className="text-sm font-bold text-[var(--marker)]">Demo mode — no payment gateway connected</p>
            <p className="mt-3 text-[15px] text-[var(--dl-ink-soft)]">
              You can connect a pretend bank account here so the rest of the product works
              end to end. It is not a real account and no money can move. When a real gateway
              is set up, this becomes a genuine bank connection with no other change.
            </p>
          </div>
        </div>
      )}

      {/* How the money actually moves — worth stating plainly. */}
      <div className="flex items-start gap-3 rounded-[3px] border border-[#FF6A4533] bg-[#FF6A450d] p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dl-ink)]" />
        <p className="text-xs leading-relaxed text-subtle">
          Paylance never holds your money. When someone pays, the transaction is split at the
          moment of payment — your share goes directly to your bank, and we only receive our fee.
          That&apos;s why there&apos;s nothing to withdraw here.
        </p>
      </div>

      {isConnected ? (
        <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[3px] bg-[#9BE3C01a]">
                <Landmark className="h-5 w-5 text-[var(--mint)]" />
              </div>
              <div>
                <p className="text-sm font-bold text-text">{account.account_name}</p>
                <p className="mt-0.5 text-xs text-subtle">
                  {account.bank_name} ···· {account.account_number_last4}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-[3px] bg-[#9BE3C01a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-[3px] border-2 border-[var(--dl-line)] bg-surface p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[3px] bg-[#FF6A451a]">
              <Landmark className="h-5 w-5 text-[var(--dl-ink)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Connect your bank account</h2>
              <p className="text-xs text-subtle">Required before you can sell anything paid.</p>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-subtle">Bank</label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="h-11 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 text-sm text-text focus:border-[var(--dl-line)] focus:outline-none"
              >
                <option value="">Select your bank</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
              {banks.length === 0 && (
                <p className="mt-1 text-[11px] text-subtle">
                  Bank list unavailable — check that payments are configured.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-subtle">Account number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="0123456789"
                className="h-11 w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 text-sm text-text placeholder:text-subtle focus:border-[var(--dl-line)] focus:outline-none"
              />
            </div>

            {resolving && (
              <p className="flex items-center gap-2 text-xs text-subtle">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking account...
              </p>
            )}

            {resolvedName && (
              <div className="rounded-[3px] border border-[#9BE3C033] bg-[#9BE3C00d] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-subtle">Account name</p>
                <p className="text-sm font-bold text-text">{resolvedName}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={!resolvedName || connecting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[3px] bg-[var(--dl-ink)] text-sm font-bold text-white transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Connect account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="flex items-start gap-2 text-[11px] text-subtle">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your account number is stored with our payment provider, not with us.
            </p>
          </div>
        </div>
      )}

      {/* Settlement history — reporting only. Nothing on this page moves
          money; it records money that has already moved. */}
      <div className="overflow-hidden rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)]">
        <div
          className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-[var(--dl-line)] px-5 py-4"
          style={{ background: "var(--dl-money-wash)" }}
        >
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-money)]">
            Payout history
          </p>
          {settlements.length > 0 && (
            <p className="text-[13px] text-[var(--dl-ink-soft)]">
              {formatKobo(totalSettled)} landed all time
            </p>
          )}
        </div>

        {settlements.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)]">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-[15px] font-bold">No payouts yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-[var(--dl-ink-soft)]">
              {sold.orders > 0
                ? "You have sales, so the first payout is with your bank's settlement cycle — it will be listed here the moment it lands."
                : "Once you start selling, each payout into your bank will be listed here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b-2 border-[var(--dl-line)]">
                  <th scope="col" className="bg-[var(--dl-neutral-wash)] px-5 py-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                    Landed
                  </th>
                  <th scope="col" className="bg-[var(--dl-neutral-wash)] px-5 py-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                    Status
                  </th>
                  <th scope="col" className="bg-[var(--dl-neutral-wash)] px-5 py-2.5 text-right text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--dl-line-soft)] last:border-b-0">
                    <td className="px-5 py-3">
                      {s.settled_at
                        ? new Date(s.settled_at).toLocaleDateString("en-NG", {
                            weekday: "short", day: "numeric", month: "short", year: "numeric",
                          })
                        : "Not yet settled"}
                    </td>
                    <td className="px-5 py-3">
                      <SettlementStatus status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-extrabold [font-variant-numeric:tabular-nums]">
                      {formatKobo(Number(s.amount_kobo))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * A payout's state, in words.
 *
 * "Reversed" is the one that matters and the one a colour alone would
 * hide: the money went in and came back out, and an organiser who only
 * saw a red dot would still believe they had been paid.
 */
function SettlementStatus({ status }: { status: string }) {
  const tone: Record<string, string> = {
    success: "border-[#17714A] text-[#17714A]",
    pending: "border-[#8A5A00] text-[#8A5A00]",
    failed: "border-[#C9294A] text-[#C9294A]",
    reversed: "border-[#7B4FA8] text-[#7B4FA8]",
  };
  const words: Record<string, string> = {
    success: "in your bank",
    pending: "on its way",
    failed: "failed",
    reversed: "reversed",
  };
  return (
    <span
      className={`inline-block rounded-[2px] border-2 px-2 py-[1px] text-[10.5px] font-extrabold uppercase tracking-[0.06em] ${
        tone[status] ?? tone.pending
      }`}
    >
      {words[status] ?? status}
    </span>
  );
}
