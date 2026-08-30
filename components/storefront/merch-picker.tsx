"use client";

import { Minus, Plus } from "lucide-react";
import { formatKobo } from "@/lib/money";
import type { PublicProduct } from "@/app/actions/events";

/** What the buyer has chosen, keyed by product id. */
export type Basket = Record<string, { quantity: number; variant: string | null }>;

/**
 * Merchandise offered beside the ticket.
 *
 * Sits above the name and email fields on purpose: the decision to add a
 * shirt is made while somebody is still thinking about the night, not while
 * they are typing their email address.
 *
 * An item with options starts on the first one rather than on nothing, so a
 * buyer who does not care about the size never has to make a choice — but
 * the options stay visible so one who does can change it.
 */
export function MerchPicker({
  products,
  basket,
  onChange,
}: {
  products: PublicProduct[];
  basket: Basket;
  onChange: (next: Basket) => void;
}) {
  if (products.length === 0) return null;

  const add = (product: PublicProduct) => {
    const options = product.variants ?? [];
    onChange({
      ...basket,
      [product.id]: {
        quantity: 1,
        variant: options.length > 0 ? options[0] : null,
      },
    });
  };

  const setQuantity = (product: PublicProduct, quantity: number) => {
    const picked = basket[product.id];
    if (!picked) return;
    const next = { ...basket };
    if (quantity <= 0) delete next[product.id];
    else next[product.id] = { ...picked, quantity };
    onChange(next);
  };

  const setVariant = (product: PublicProduct, variant: string) => {
    const picked = basket[product.id];
    if (!picked) return;
    onChange({ ...basket, [product.id]: { ...picked, variant } });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[var(--dl-ink)]">Add to your order</p>

      {products.map((product) => {
        const picked = basket[product.id];
        const options = product.variants ?? [];

        // Never let the stepper offer more than the organiser will sell, or
        // more than is left. The server checks both again.
        const ceiling =
          product.remaining === null
            ? product.maxPerOrder
            : Math.min(product.maxPerOrder, product.remaining);

        return (
          <div
            key={product.id}
            className={`rounded-[3px] border p-3 transition-colors ${
              picked ? "border-[var(--dl-line)] bg-[var(--dl-ink)] text-[var(--dl-paper)]" : "border-[var(--dl-line)] bg-[var(--dl-panel)]"
            } ${product.soldOut ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-3">
              {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-[3px] object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--dl-ink)]">{product.name}</p>
                {product.description && (
                  <p className="truncate text-xs text-[var(--dl-ink-faint)]">{product.description}</p>
                )}
                <p className="text-xs text-[var(--dl-ink-soft)]">
                  {product.priceKobo === 0 ? "Free" : formatKobo(product.priceKobo)}
                  {product.soldOut && " · Sold out"}
                </p>
              </div>

              {!product.soldOut &&
                (picked ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => setQuantity(product, picked.quantity - 1)}
                      aria-label={`One fewer ${product.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)] "
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums text-[var(--dl-ink)]">
                      {picked.quantity}
                    </span>
                    <button
                      disabled={picked.quantity >= ceiling}
                      onClick={() => setQuantity(product, picked.quantity + 1)}
                      aria-label={`One more ${product.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-[3px] border-2 border-[var(--dl-line)]  disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => add(product)}
                    className="shrink-0 rounded-[3px] border-2 border-[var(--dl-line)] px-3 py-1.5 text-xs font-bold"
                  >
                    Add
                  </button>
                ))}
            </div>

            {picked && options.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setVariant(product, option)}
                    className={`rounded-[3px] border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      picked.variant === option
                        ? "border-[var(--dl-line)] bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                        : "border-[var(--dl-line)] text-[var(--dl-ink-soft)]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
