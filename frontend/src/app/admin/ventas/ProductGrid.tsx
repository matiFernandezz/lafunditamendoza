"use client";

import { Plus } from "lucide-react";
import type { AdminProduct, AdminVariant } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { ADMIN_CARD, ADMIN_TEXT_MUTED } from "../adminStyles";
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
      <p className="rounded-md border border-dashed border-admin-border p-6 text-center text-sm text-admin-muted">
        No encontramos productos con ese filtro.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => (
        <li key={product.id} className={`${ADMIN_CARD} min-w-0 self-start`}>
          <h3 className="text-sm font-semibold text-admin-text sm:text-base">{product.name}</h3>
          <ul className="mt-2 divide-y divide-admin-border">
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
                    className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-left hover:bg-admin-bg disabled:opacity-40"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-admin-text">
                        {variantLabel(variant, modelName)}
                      </p>
                      <p className={ADMIN_TEXT_MUTED}>
                        {outOfStock ? (
                          <span className="font-semibold text-admin-danger">Sin stock</span>
                        ) : (
                          <>
                            {variant.stock_quantity <= LOW_STOCK && (
                              <span className="font-semibold text-amber-700">
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
                      <span className="text-sm font-semibold text-admin-text">
                        {formatPrice(variant.price)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex size-8 items-center justify-center rounded-full bg-black text-white"
                      >
                        <Plus className="size-4" />
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
