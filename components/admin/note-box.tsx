"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { addAdminNote } from "@/app/actions/admin";

/** Notes are appended and never edited — see the table comment in setup.sql. */
export function NoteBox({
  subjectType,
  subjectId,
  notes,
}: {
  subjectType: "organiser" | "event" | "order" | "customer";
  subjectId: string;
  notes: { body: string; author_email: string | null; created_at: string }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const save = async () => {
    setBusy(true);
    try {
      const res = await addAdminNote(subjectType, subjectId, body);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setBody("");
      toast.success("Note added.");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Internal note. Only admins see this."
        className="w-full rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-[var(--dl-ink-faint)]"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy || !body.trim()}
        className="mt-2 flex items-center gap-2 rounded-[3px] border-2 border-[var(--dl-line)] px-4 py-2 text-[12.5px] font-extrabold uppercase tracking-[0.04em] disabled:opacity-40"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Add note
      </button>

      {notes.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          {notes.map((n, i) => (
            <div key={i} className="border-l-2 border-[var(--dl-line)] pl-3.5">
              <p className="text-[11.5px] font-bold text-[var(--dl-ink-faint)]">
                {n.author_email ?? "admin"} ·{" "}
                {new Date(n.created_at).toLocaleString("en-NG", {
                  day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
