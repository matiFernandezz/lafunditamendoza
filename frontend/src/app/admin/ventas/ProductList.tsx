"use client";

import Image from "next/image";
import { ChevronDown, ImageOff } from "lucide-react";
import { useState } from "react";
import type { AdminProduct, AdminVariant } from "@/lib/adminApi";
import { formatPrice, formatPriceRange } from "@/lib/format";
import { ADMIN_EMPTY } from "../adminStyles";
import { variantLabel } from "./utils";

const LOW_STOCK = 3;

function firstImage(product: AdminProduct): string | null {
  const sorted = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.url ?? product.image_url;
}

/** Producto con las variantes a mostrar; autoOpen si la búsqueda dio con un modelo o SKU. */
export type ListedProduct = { product: AdminProduct; variants: AdminVariant[]; autoOpen: boolean };

/**
 * Catálogo de la venta: un renglón por producto, plegado. Al desplegarlo
 * aparecen sus modelos como botones; tocar uno lo suma a la venta.
 */
export default function ProductList({
  items,
  expanded,
  onToggle,
  modelNamesById,
  categoryNamesById,
  cartQuantities,
  onAdd,
}: {
  items: ListedProduct[];
  /** Ids que el usuario abrió o cerró a mano (se invierte sobre autoOpen). */
  expanded: Set<string>;
  onToggle: (productId: string) => void;
  modelNamesById: Map<string, string>;
  categoryNamesById: Map<string, string>;
  cartQuantities: Map<string, number>;
  onAdd: (product: AdminProduct, variant: AdminVariant) => void;
}) {
  // Productos donde se pidió ver también los modelos sin stock.
  const [showEmpty, setShowEmpty] = useState<Set<string>>(new Set());

  if (items.length === 0) {
    return <p className={ADMIN_EMPTY}>No encontramos productos con esa búsqueda.</p>;
  }

  return (
    <ul className="divide-y divide-admin-border overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
      {items.map(({ product, variants, autoOpen }) => {
        const open = expanded.has(product.id) !== autoOpen;
        const image = firstImage(product);
        const stock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
        const withStock = variants.filter((v) => v.stock_quantity > 0).length;
        const inCart = variants.reduce((sum, v) => sum + (cartQuantities.get(v.id) ?? 0), 0);
        const panelId = `modelos-${product.id}`;
        const emptyCount = variants.length - withStock;
        const showingEmpty = showEmpty.has(product.id) || withStock === 0;
        const shown = showingEmpty ? variants : variants.filter((v) => v.stock_quantity > 0);

        return (
          <li key={product.id} className={open ? "bg-admin-bg/60" : ""}>
            <button
              type="button"
              onClick={() => onToggle(product.id)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-admin-bg"
            >
              <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-admin-border bg-admin-bg">
                {image ? (
                  <Image src={image} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <ImageOff aria-hidden="true" className="size-5 text-admin-muted" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-admin-text">{product.name}</span>
                <span className="block truncate text-[13px] text-admin-muted">
                  {categoryNamesById.get(product.category_id) ?? ""}
                </span>
              </span>
              <span className="hidden shrink-0 flex-col items-end sm:flex">
                <span className="font-mono text-[15px] font-semibold tabular-nums text-admin-text">
                  {formatPriceRange(variants.map((v) => v.price))}
                </span>
                <span className={`text-[13px] ${stock === 0 ? "font-semibold text-admin-danger" : "text-admin-muted"}`}>
                  {stock === 0
                    ? "Sin stock"
                    : `${stock} en stock · ${withStock} ${withStock === 1 ? "modelo" : "modelos"}`}
                </span>
              </span>
              {inCart > 0 && (
                <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-admin-ink px-1.5 font-mono text-xs font-bold text-admin-on-ink">
                  {inCart}
                </span>
              )}
              <ChevronDown
                aria-hidden="true"
                className={`size-5 shrink-0 text-admin-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div id={panelId} className="px-4 pb-4 pt-1">
                <p className="mb-2 text-[13px] text-admin-muted sm:hidden">
                  {formatPriceRange(variants.map((v) => v.price))} ·{" "}
                  {stock === 0 ? "Sin stock" : `${stock} en stock`}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {shown.map((variant) => {
                    const quantity = cartQuantities.get(variant.id) ?? 0;
                    const outOfStock = variant.stock_quantity <= 0;
                    const atLimit = !outOfStock && quantity >= variant.stock_quantity;
                    const modelName = variant.iphone_model_id ? modelNamesById.get(variant.iphone_model_id) : undefined;
                    const selected = quantity > 0;
                    return (
                      <li key={variant.id}>
                        <button
                          type="button"
                          onClick={() => onAdd(product, variant)}
                          disabled={outOfStock || atLimit}
                          title={atLimit ? "Ya sumaste todo el stock de este modelo" : undefined}
                          className={`flex min-h-11 items-center gap-2 rounded-full border px-4 py-1.5 text-left text-[15px] transition-colors duration-150 disabled:cursor-not-allowed ${
                            selected
                              ? "border-admin-ink bg-admin-ink text-admin-on-ink"
                              : outOfStock
                                ? "border-admin-border bg-admin-bg text-admin-muted"
                                : "border-admin-border-strong bg-admin-surface text-admin-text hover:border-admin-ink"
                          }`}
                        >
                          <span className="font-semibold">{variantLabel(variant, modelName)}</span>
                          <span className="font-mono text-sm tabular-nums opacity-80">{formatPrice(variant.price)}</span>
                          {outOfStock ? (
                            <span className="text-[13px]">Sin stock</span>
                          ) : selected ? (
                            <span className="font-mono text-[13px] font-bold">× {quantity}</span>
                          ) : (
                            variant.stock_quantity <= LOW_STOCK && (
                              <span className="text-[13px] font-semibold text-admin-warn">
                                {variant.stock_quantity === 1 ? "queda 1" : `quedan ${variant.stock_quantity}`}
                              </span>
                            )
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {emptyCount > 0 && withStock > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowEmpty((prev) => {
                        const next = new Set(prev);
                        if (next.has(product.id)) next.delete(product.id);
                        else next.add(product.id);
                        return next;
                      })
                    }
                    className="mt-2.5 text-[13px] font-semibold text-admin-muted underline-offset-2 hover:text-admin-text hover:underline"
                  >
                    {showingEmpty
                      ? "Ocultar los modelos sin stock"
                      : emptyCount === 1
                        ? "Ver 1 modelo sin stock"
                        : `Ver ${emptyCount} modelos sin stock`}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
