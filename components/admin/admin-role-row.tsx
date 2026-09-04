"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { setAdminRole, removeAdmin } from "@/app/actions/admin";
import { ROLE_LABELS, type AdminRole } from "@/lib/admin-roles";

const ROLES: AdminRole[] = ["super_admin", "operations", "finance", "support"];

export function AdminRoleRow({
  userId, email, role, addedAt, isSelf, first,
}: {
  userId: string;
  email: string;
  role: AdminRole;
  addedAt: string;
  isSelf: boolean;
  first: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [, startTransition] = useTransition();

  const change = async (next: AdminRole) => {
    if (next === role) return;
    setBusy(true);
    try {
      const res = await setAdminRole(userId, next, "");
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Role changed, and logged.");
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await removeAdmin(userId, "");
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Removed, and logged.");
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 px-5 py-4 ${first ? "" : "border-t-2 border-[var(--dl-line)]"}`}>
      <div className="min-w-[200px] flex-1">
        <p className="truncate text-[14.5px] font-extrabold">
          {email}
          {isSelf && <span className="ml-2 text-[12px] font-bold text-[var(--dl-ink-faint)]">you</span>}
        </p>
        <p className="text-[12.5px] text-[var(--dl-ink-soft)]">Added {addedAt}</p>
      </div>

      <select
        value={role}
        disabled={busy}
        onChange={(e) => change(e.target.value as AdminRole)}
        className="rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3 py-2 text-[13.5px] font-bold outline-none disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>

      {!isSelf &&
        (confirmRemove ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-[3px] border-2 border-[var(--dl-danger)] bg-[var(--dl-danger)] px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.04em] text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />} Remove
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.04em]"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            disabled={busy}
            className="rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.04em] text-[var(--dl-danger)]"
          >
            Remove
          </button>
        ))}
    </div>
  );
}
