"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImagePlus, Loader2, Package, Pencil, RotateCcw, Trash2, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import {
  createProduct, listProducts, removeProduct, restoreProduct, updateProduct,
  type DashboardProduct, type ProductInput,
} from "@/app/actions/products";
import { toast } from "sonner";

const EMPTY_FORM: ProductInput = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  maxPerOrder: "10",
  variants: "",
  requiresCollection: true,
  imageUrl: null,
};

/**
 * Merchandise for one event — a shirt, a programme, a drink token.
 *
 * Sold from the same checkout as the ticket, which is the whole point: the
 * moment somebody has decided to come is the moment they will buy the
 * shirt, not a separate trip to a separate shop.
 */
export function MerchEditor({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<DashboardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listProducts(eventId));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(item: DashboardProduct) {
    setEditingId(item.id);
    setAdding(false);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.priceKobo / 100),
      quantity: item.quantity === null ? "" : String(item.quantity),
      maxPerOrder: String(item.maxPerOrder),
      variants: (item.variants ?? []).join(", "),
      requiresCollection: item.requiresCollection,
      imageUrl: item.imageUrl,
    });
  }

  async function uploadImage(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("That image is over 4MB. Try a smaller one.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${eventId}/merch-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("event_covers")
        .upload(path, file);

      if (error) {
        toast.error("Couldn't upload that image.");
        return;
      }
      const url = supabase.storage.from("event_covers").getPublicUrl(path)
        .data.publicUrl;
      setForm((f) => ({ ...f, imageUrl: url }));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const result = editingId
        ? await updateProduct(editingId, form)
        : await createProduct(eventId, form);

      if (!result.success) {
        toast.error(result.error ?? "Could not save that item.");
        return;
      }
      toast.success(editingId ? "Item updated." : "Item added.");
      cancel();
      await fetchItems();
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: DashboardProduct) {
    const message = item.soldCount
      ? `Stop selling "${item.name}"? ${item.soldCount} already sold, so it stays on your records and those orders keep working.`
      : `Delete "${item.name}"?`;
    if (!window.confirm(message)) return;

    const result = await removeProduct(item.id);
    if (!result.success) {
      toast.error(result.error ?? "Could not remove that item.");
      return;
    }
    toast.success(item.soldCount ? "No longer on sale." : "Item deleted.");
    await fetchItems();
  }

  async function restore(item: DashboardProduct) {
    const result = await restoreProduct(item.id);
    if (!result.success) {
      toast.error(result.error ?? "Could not put that back on sale.");
      return;
    }
    toast.success("Back on sale.");
    await fetchItems();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-subtle">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const active = items.filter((i) => i.status === "active");
  const hidden = items.filter((i) => i.status === "hidden");
  const input =
    "w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-text placeholder:text-subtle focus:border-[var(--coral)] focus:outline-none";
  const label = "mb-1 block text-xs font-medium text-subtle";

  const editor = (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-text">
          {editingId ? "Edit item" : "New item"}
        </h3>
        <button onClick={cancel} className="text-subtle hover:text-text">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted hover:border-[var(--coral)]"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-subtle" />
            ) : form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5 text-subtle" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f);
            }}
          />

          <div className="flex-1 space-y-3">
            <div>
              <label className={label}>Item name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tour hoodie"
                className={input}
              />
            </div>
            <div>
              <label className={label}>Price</label>
              <input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="15,000"
                className={input}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={label}>
            Description <span className="text-subtle/70">optional</span>
          </label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Heavyweight cotton, printed front and back"
            className={input}
          />
        </div>

        <div>
          <label className={label}>
            Options <span className="text-subtle/70">optional — separate with commas</span>
          </label>
          <input
            value={form.variants}
            onChange={(e) => setForm({ ...form, variants: e.target.value })}
            placeholder="S, M, L, XL"
            className={input}
          />
          <p className="mt-1 text-xs text-subtle">
            Buyers pick one at checkout. Leave blank if there&apos;s nothing to choose.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>
              How many <span className="text-subtle/70">blank = unlimited</span>
            </label>
            <input
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="50"
              className={input}
            />
          </div>
          <div>
            <label className={label}>Max per order</label>
            <input
              value={form.maxPerOrder}
              onChange={(e) => setForm({ ...form, maxPerOrder: e.target.value })}
              placeholder="10"
              className={input}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={form.requiresCollection ?? true}
            onChange={(e) =>
              setForm({ ...form, requiresCollection: e.target.checked })
            }
            className="mt-0.5 h-4 w-4 accent-[var(--coral)]"
          />
          <span className="text-xs text-subtle">
            Collected at the door. Shows on the check-in screen so nobody walks
            off without what they paid for.
          </span>
        </label>

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving || uploading}
            className="flex items-center gap-2 rounded-lg bg-[var(--coral)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--coral)] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingId ? "Save changes" : "Add item"}
          </button>
          <button
            onClick={cancel}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-subtle hover:text-text"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text">Merchandise</h2>
          <p className="text-xs text-subtle">
            Sold from the same checkout as the ticket.
          </p>
        </div>
        {!adding && !editingId && (
          <button
            onClick={() => {
              setAdding(true);
              setForm(EMPTY_FORM);
            }}
            className="rounded-lg bg-[var(--coral)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--coral)]"
          >
            Add item
          </button>
        )}
      </div>

      {(adding || editingId) && editor}

      {active.length === 0 && !adding && !editingId && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <Package className="mx-auto h-7 w-7 text-subtle" />
          <p className="mt-3 text-sm font-semibold text-text">
            Nothing on the stall yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-subtle">
            Shirts, caps, programmes, drink tokens. Anything you&apos;d sell on
            the night — buyers add it while they&apos;re already paying for
            their ticket.
          </p>
          <button
            onClick={() => {
              setAdding(true);
              setForm(EMPTY_FORM);
            }}
            className="mt-4 rounded-lg bg-[var(--coral)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--coral)]"
          >
            Add your first item
          </button>
        </div>
      )}

      {active.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          onEdit={() => startEdit(item)}
          onRemove={() => remove(item)}
        />
      ))}

      {hidden.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
            No longer on sale
          </p>
          {hidden.map((item) => (
            <ItemRow key={item.id} item={item} muted onRestore={() => restore(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  muted,
  onEdit,
  onRemove,
  onRestore,
}: {
  item: DashboardProduct;
  muted?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
}) {
  const left =
    item.quantity === null ? null : Math.max(0, item.quantity - item.soldCount);
  const soldOut = left === 0;

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-border bg-surface p-4 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Package className="h-5 w-5 text-subtle" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-text">{item.name}</p>
          {soldOut && !muted && (
            <span className="rounded-full bg-[#FFDE5926] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--marker)]">
              Sold out
            </span>
          )}
        </div>
        {item.description && (
          <p className="truncate text-xs text-subtle">{item.description}</p>
        )}
        <p className="mt-1 text-xs text-subtle">
          {item.priceKobo === 0 ? "Free" : formatKobo(item.priceKobo)}
          {item.variants?.length ? ` · ${item.variants.join(" / ")}` : ""}
          {" · "}
          {item.soldCount} sold
          {left !== null && `, ${left} left`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onEdit && (
          <button
            onClick={onEdit}
            aria-label={`Edit ${item.name}`}
            className="rounded-lg p-2 text-subtle hover:bg-muted hover:text-text"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${item.name}`}
            className="rounded-lg p-2 text-subtle hover:bg-muted hover:text-[var(--danger)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {onRestore && (
          <button
            onClick={onRestore}
            aria-label={`Put ${item.name} back on sale`}
            className="rounded-lg p-2 text-subtle hover:bg-muted hover:text-text"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
