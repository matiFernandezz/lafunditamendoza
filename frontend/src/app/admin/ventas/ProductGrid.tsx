"use client";

import Image from "next/image";
import { ImageOff, Plus } from "lucide-react";
import type { AdminProduct, AdminVariant } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { ADMIN_EMPTY, ADMIN_TEXT_MUTED } from "../adminStyles";
import { variantLabel } from "./utils";

const LOW_STOCK = 3;

function firstImage(product: AdminProduct): string | null {
  const sorted = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.url ?? product.image_url;
}

export default function ProductGrid({
  products,
  modelNamesById,
  categoryNamesById,
  cartQuantities,
  onAdd,
}: {
  products: AdminProduct[];
  modelNamesById: Map<string, string>;
  categoryNamesById: Map<string, string>;
  cartQuantities: Map<string, number>;
  onAdd: (product: AdminProduct, variant: AdminVariant) => void;
}) {
  if (products.length === 0) {
    return <p className={ADMIN_EMPTY}>No encontramos productos con esa búsqueda.</p>;
  }

  return (
    <ul className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
      {products.map((product) => {
        const image = firstImage(product);
        return (
          <li key={product.id} className="min-w-0 overflow-hidden rounded-md border border-admin-border bg-white">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-admin-border bg-admin-bg">
                {image ? (
                  <Image src={image} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <ImageOff aria-hidden="true" className="size-5 text-admin-muted" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-admin-text">{product.name}</h3>
                <p className={ADMIN_TEXT_MUTED}>{categoryNamesById.get(product.category_id) ?? ""}</p>
              </div>
            </div>
            <ul>
              {product.product_variants.map((variant) => {
                const inCart = cartQuantities.get(variant.id) ?? 0;
                const outOfStock = variant.stock_quantity <= 0;
                const atLimit = !outOfStock && inCart >= variant.stock_quantity;
                const blocked = outOfStock || atLimit;
                const modelName = variant.iphone_model_id
                  ? modelNamesById.get(variant.iphone_model_id)
                  : undefined;

                return (
                  <li key={variant.id}>
                    <button
                      type="button"
                      onClick={() => onAdd(product, variant)}
                      disabled={blocked}
                      className={`flex min-h-[60px] w-full items-center justify-between gap-3 border-t border-admin-border py-2 pl-4 pr-3 text-left transition-colors duration-200 enabled:hover:bg-admin-bg ${
                        inCart > 0 ? "bg-[#f5f5f5]" : "bg-white"
                      }`}
                    >
                      <span className={`min-w-0 ${outOfStock ? "opacity-45" : ""}`}>
                        <span className="block break-words text-[15px] font-medium text-admin-text">
                          {variantLabel(variant, modelName)}
                        </span>
                        <span className={`mt-0.5 flex flex-wrap gap-1.5 ${ADMIN_TEXT_MUTED}`}>
                          {outOfStock ? (
                            <span className="font-semibold text-admin-danger">Sin stock</span>
                          ) : variant.stock_quantity <= LOW_STOCK ? (
                            <span className="font-semibold text-admin-warn">Quedan {variant.stock_quantity}</span>
                          ) : (
                            <span>Stock {variant.stock_quantity}</span>
                          )}
                          {inCart > 0 && (
                            <span className="font-semibold text-admin-text">· {inCart} en la venta</span>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span
                          className={`font-mono text-[15px] font-semibold tabular-nums text-admin-text ${
                            outOfStock ? "opacity-45" : ""
                          }`}
                        >
                          {formatPrice(variant.price)}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex size-10 items-center justify-center rounded-full ${
                            blocked ? "bg-admin-disabled-bg text-admin-disabled-fg" : "bg-admin-ink text-white"
                          }`}
                        >
                          <Plus className="size-5" strokeWidth={2.2} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
