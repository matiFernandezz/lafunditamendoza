"use client";

import type { AdminProduct, AdminVariant } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { variantLabel } from "./utils";

const LOW_STOCK = 3;

export default function ProductGrid({
  products,
  modelNamesById,
  cartQuantities,
  onAdd,
}: {
  products: AdminProduct[];
  modelNamesById: Map<string, string>;
  cartQuantities: Map<string, number>;
  onAdd: (product: AdminProduct, variant: AdminVariant) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
        No encontramos productos con ese filtro.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => (
        <li key={product.id} className="min-w-0 self-start rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-base font-semibold">{product.name}</h3>
          <ul className="mt-2 divide-y divide-zinc-100">
            {product.product_variants.map((variant) => {
              const inCart = cartQuantities.get(variant.id) ?? 0;
              const outOfStock = variant.stock_quantity <= 0;
              const atLimit = !outOfStock && inCart >= variant.stock_quantity;
              const modelName = variant.iphone_model_id
                ? modelNamesById.get(variant.iphone_model_id)
                : undefined;

              return (
                <li key={variant.id} className="py-1">
                  <button
                    type="button"
                    onClick={() => onAdd(product, variant)}
                    disabled={outOfStock || atLimit}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-left active:bg-zinc-100 disabled:opacity-40"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{variantLabel(variant, modelName)}</p>
                      <p className="text-xs text-zinc-500">
                        {outOfStock ? (
                          <span className="font-medium text-red-600">Sin stock</span>
                        ) : (
                          <>
                            {variant.stock_quantity <= LOW_STOCK && (
                              <span className="font-medium text-amber-700">
                                Quedan {variant.stock_quantity}
                              </span>
                            )}
                            {inCart > 0 && (
                              <span>
                                {variant.stock_quantity <= LOW_STOCK ? " · " : ""}
                                {inCart} en la venta
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold">{formatPrice(variant.price)}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-lg font-bold text-white">
                        +
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
