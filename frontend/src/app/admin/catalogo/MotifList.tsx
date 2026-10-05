"use client";

import { X } from "lucide-react";
import type { AdminProduct } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import ColorField from "../ColorField";
import { ADMIN_TEXT_MUTED } from "../adminStyles";
import { getLibrary, useAttributeLibrary } from "../attributeLibrary";
import { useCells } from "./useCells";

/**
 * Motivos de un producto sin modelo de iPhone (un protector de cargador): cada
 * motivo es UNA variante, con su stock y su precio (que se editan en la lista
 * de variantes). "+ Agregar motivo" la crea con stock 0 y el precio de otra;
 * la "x" la da de baja, sin borrarla.
 */
export default function MotifList({
  product,
  onChanged,
}: {
  product: AdminProduct;
  onChanged: () => Promise<void> | void;
}) {
  const { motifs } = useAttributeLibrary();
  const cells = useCells({ productId: product.id, kind: "motif", onChanged });

  const variantByMotif = new Map(
    product.product_variants.filter((v) => v.active && v.motif_id !== null).map((v) => [v.motif_id as string, v]),
  );
  const productMotifs = motifs.filter((m) => variantByMotif.has(m.id));
  const hasAny = product.product_variants.some((v) => v.color_id !== null || v.motif_id !== null);

  async function add(name: string) {
    const motif = getLibrary().motifs.find((m) => m.name.toLowerCase() === name.toLowerCase());
    if (!motif) return;
    // Producto sin motivos: el primero se le pone a su variante actual.
    if (!hasAny && product.product_variants.length > 0 && (await cells.assignFirst(motif, [null]))) return;
    await cells.set(motif, [null], true);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {productMotifs.length > 0 && (
        <ul className="divide-y divide-admin-border border-y border-admin-border">
          {productMotifs.map((motif) => {
            const variant = variantByMotif.get(motif.id);
            return (
              <li key={motif.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 break-words text-[15px] font-semibold text-admin-text">{motif.name}</span>
                {variant && (
                  <span className={`shrink-0 font-mono tabular-nums ${ADMIN_TEXT_MUTED}`}>
                    {variant.stock_quantity} u. · {formatPrice(variant.price)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => cells.set(motif, [null], false)}
                  disabled={cells.busy}
                  aria-label={`Quitar ${motif.name} de ${product.name}`}
                  title={`Quitar ${motif.name}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-admin-muted transition-colors duration-200 hover:bg-admin-bg hover:text-admin-danger disabled:opacity-40"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {cells.panel}

      {!cells.pending && (
        <ColorField
          key={productMotifs.length}
          kind="motif"
          label={`Agregar motivo a ${product.name}`}
          placeholder="+ Agregar motivo"
          value=""
          takenIds={new Set(productMotifs.map((m) => m.id))}
          allowEmpty={false}
          allowText={false}
          disabled={cells.busy}
          onChange={add}
          className="sm:max-w-[280px]"
        />
      )}

      <p className={ADMIN_TEXT_MUTED}>
        Cada motivo es una variante con su stock y su precio. Agregar uno la crea con stock 0; quitarlo la da de baja,
        sin borrarla.
      </p>
    </div>
  );
}
