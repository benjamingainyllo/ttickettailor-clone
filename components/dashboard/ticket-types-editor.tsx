"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2, Pencil, Trash2, Ticket, EyeOff, RotateCcw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKobo, koboToNaira } from "@/lib/money";
import {
  createTicketType,
  updateTicketType,
  removeTicketType,
  restoreTicketType,
  type TicketTypeInput,
} from "@/app/actions/ticket-types";
import { toast } from "sonner";

interface TicketTypeRow {
  id: string;
  name: string;
  description: string | null;
  price_kobo: number;
  quantity: number | null;
  sold_count: number;
  max_per_order: number;
  status: "active" | "hidden";
  sort_order: number;
}

const EMPTY_FORM: TicketTypeInput = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  maxPerOrder: "10",
};

/**
 * What the event actually sells.
 *
 * An event with no tiers can't sell anything, so this is the first thing
 * the organiser should see after creating one — the empty state says so
 * rather than just showing a blank list.
 */
export function TicketTypesEditor({ eventId }: { eventId: string }) {
  const [tiers, setTiers] = useState<TicketTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<TicketTypeInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchTiers = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order");

      if (error) throw error;
      setTiers((data ?? []) as TicketTypeRow[]);
    } catch (error) {
      console.error("Could not load ticket types:", error);
      setLoadError("Couldn't load ticket types. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(tier: TicketTypeRow) {
    setForm({
      name: tier.name,
      description: tier.description ?? "",
      price: tier.price_kobo ? String(koboToNaira(tier.price_kobo)) : "0",
      quantity: tier.quantity === null ? "" : String(tier.quantity),
      maxPerOrder: String(tier.max_per_order),
    });
    setAdding(false);
    setEditingId(tier.id);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function save() {
    setSaving(true);
    try {
      const result = editingId
        ? await updateTicketType(editingId, form)
        : await createTicketType(eventId, form);

      if (!result.success) {
        toast.error(result.error ?? "Could not save that ticket type.");
        return;
      }

      toast.success(editingId ? "Ticket type updated." : "Ticket type added.");
      cancel();
      await fetchTiers();
    } finally {
      setSaving(false);
    }
  }

  async function remove(tier: TicketTypeRow) {
    const sold = Number(tier.sold_count ?? 0);
    const message = sold
      ? `Stop selling "${tier.name}"? ${sold} already sold, so it stays on the books and those tickets keep working.`
      : `Delete "${tier.name}"?`;
    if (!window.confirm(message)) return;

    const result = await removeTicketType(tier.id);
    if (!result.success) {
      toast.error(result.error ?? "Could not remove that ticket type.");
      return;
    }
    toast.success(sold ? "No longer on sale." : "Ticket type deleted.");
    await fetchTiers();
  }

  async function restore(tier: TicketTypeRow) {
    const result = await restoreTicketType(tier.id);
    if (!result.success) {
      toast.error(result.error ?? "Could not put that back on sale.");
      return;
    }
    toast.success("Back on sale.");
    await fetchTiers();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-subtle">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-subtle">{loadError}</p>
        <button
          onClick={fetchTiers}
          className="mt-3 text-sm font-semibold text-[var(--coral)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const active = tiers.filter((t) => t.status === "active");
  const hidden = tiers.filter((t) => t.status === "hidden");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text">Ticket types</h3>
          <p className="text-xs text-subtle">
            What people can buy. The cheapest active type is the price shown on your event.
          </p>
        </div>
        {!adding && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 rounded-lg bg-text px-3 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add type
          </button>
        )}
      </div>

      {active.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-subtle">
            <Ticket className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-text">No ticket types yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-subtle">
            An event with no ticket types can&apos;t sell anything. Add one to
            put this event on sale.
          </p>
          <button
            onClick={startAdd}
            className="mt-4 rounded-lg bg-text px-4 py-2 text-xs font-bold text-background"
          >
            Add the first one
          </button>
        </div>
      )}

      {(adding || editingId) && (
        <TierForm
          form={form}
          setForm={setForm}
          onSave={save}
          onCancel={cancel}
          saving={saving}
          isEdit={Boolean(editingId)}
        />
      )}

      <div className="space-y-2">
        {active.map((tier) =>
          editingId === tier.id ? null : (
            <TierRow
              key={tier.id}
              tier={tier}
              onEdit={() => startEdit(tier)}
              onRemove={() => remove(tier)}
            />
          )
        )}
      </div>

      {hidden.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
            No longer on sale
          </p>
          {hidden.map((tier) => (
            <TierRow key={tier.id} tier={tier} onRestore={() => restore(tier)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TierRow({
  tier,
  onEdit,
  onRemove,
  onRestore,
}: {
  tier: TicketTypeRow;
  onEdit?: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
}) {
  const sold = Number(tier.sold_count ?? 0);
  const cap = tier.quantity;
  const soldOut = cap !== null && sold >= cap;
  const pct = cap ? Math.min(100, Math.round((sold / cap) * 100)) : 0;

  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 ${
        tier.status === "hidden" ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-text">{tier.name}</span>
            {soldOut && (
              <span className="rounded-full bg-[#FF54701a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--danger)]">
                Sold out
              </span>
            )}
            {tier.status === "hidden" && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-subtle">
                <EyeOff className="h-2.5 w-2.5" />
                Hidden
              </span>
            )}
          </div>

          {tier.description && (
            <p className="mt-1 line-clamp-2 text-xs text-subtle">{tier.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <span className="font-semibold text-text">
              {tier.price_kobo === 0 ? "Free" : formatKobo(tier.price_kobo)}
            </span>
            <span>·</span>
            <span>
              {sold} sold{cap !== null ? ` of ${cap}` : ""}
            </span>
            {cap === null && <span className="text-subtle">· unlimited</span>}
          </div>

          {cap !== null && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  soldOut ? "bg-[var(--danger)]" : "bg-[var(--coral)]"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label={`Edit ${tier.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-muted hover:text-text"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label={`Remove ${tier.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-[#FF54701a] hover:text-[var(--danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onRestore && (
            <button
              onClick={onRestore}
              aria-label={`Put ${tier.name} back on sale`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-muted hover:text-text"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TierForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isEdit,
}: {
  form: TicketTypeInput;
  setForm: (f: TicketTypeInput) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  const field =
    "h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-text placeholder:text-subtle focus:border-[var(--coral)] focus:outline-none";

  return (
    <div className="rounded-xl border border-[#FF6A4566] bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-text">
          {isEdit ? "Edit ticket type" : "New ticket type"}
        </h4>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-subtle hover:bg-muted hover:text-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-subtle">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Early Bird"
            className={field}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-subtle">
            Description <span className="font-normal">(optional)</span>
          </label>
          <input
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Includes a drink on arrival"
            className={field}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-subtle">Price (₦)</label>
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              inputMode="decimal"
              placeholder="0"
              className={field}
            />
            <p className="mt-1 text-[11px] text-subtle">0 for a free ticket.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-subtle">How many</label>
            <input
              value={form.quantity ?? ""}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              inputMode="numeric"
              placeholder="Unlimited"
              className={field}
            />
            <p className="mt-1 text-[11px] text-subtle">Blank for no limit.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-subtle">Max per order</label>
            <input
              value={form.maxPerOrder ?? ""}
              onChange={(e) => setForm({ ...form, maxPerOrder: e.target.value })}
              inputMode="numeric"
              placeholder="10"
              className={field}
            />
            <p className="mt-1 text-[11px] text-subtle">Per checkout.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-text px-4 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save changes" : "Add ticket type"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-subtle hover:text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
