"use client";

import type { AdminIphoneModel, AdminProduct } from "@/lib/adminApi";
import { ADMIN_CAP, ADMIN_TEXT_MUTED } from "../adminStyles";
import { displayColor } from "../ventas/utils";
import AttributeMatrix from "./AttributeMatrix";
import MotifList from "./MotifList";

/**
 * Colores y motivos de un producto. Un producto usa colores O motivos, nunca
 * los dos: la sección del que no usa explica por qué no se puede.
 *
 * - Colores: matriz modelo × color. Solo fundas: en Accesorios no aparece.
 * - Motivos: en cualquier categoría. Sin modelos de iPhone (protectores de
 *   cargador) es una lista simple; con modelos, la misma matriz.
 * - Si las variantes se distinguen por una descripción libre ("tipo C a C"),
 *   no se ofrece ninguno de los dos.
 */
export default function ProductAttributes({
  product,
  models,
  accessory,
  onChanged,
}: {
  product: AdminProduct;
  models: AdminIphoneModel[];
  /** La categoría es Accesorios o uno de sus tipos: sin colores por modelo. */
  accessory: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const variants = product.product_variants;
  const usesColors = variants.some((v) => v.active && v.color_id !== null);
  const usesMotifs = variants.some((v) => v.active && v.motif_id !== null);
  const hasAny = variants.some((v) => v.color_id !== null || v.motif_id !== null);
  // Descripciones libres, en un producto sin colores ni motivos.
  const descriptions = hasAny
    ? []
    : [...new Set(variants.map((v) => displayColor(v.color)).filter((d): d is string => d !== null))];
  const hasModels = variants.some((v) => v.iphone_model_id !== null);

  const blocked = (what: "colores" | "motivos") =>
    variants.length === 0
      ? `Primero agregale variantes al producto; después se le pueden poner ${what}.`
      : descriptions.length > 0
        ? `Sus variantes se distinguen por una descripción libre (${descriptions.slice(0, 4).join(", ")}${
            descriptions.length > 4 ? "…" : ""
          }): no se le pueden poner ${what}.`
        : null;

  const colorsBlocked = usesMotifs ? "Este producto usa motivos: no puede tener colores." : blocked("colores");
  const motifsBlocked = usesColors ? "Este producto usa colores: no puede tener motivos." : blocked("motivos");

  return (
    <>
      {!accessory && (
        <section className="flex min-w-0 flex-col gap-2.5">
          <h3 className={ADMIN_CAP}>Colores por modelo</h3>
          {colorsBlocked ? (
            <p className={ADMIN_TEXT_MUTED}>{colorsBlocked}</p>
          ) : (
            <AttributeMatrix product={product} kind="color" models={models} onChanged={onChanged} />
          )}
        </section>
      )}

      <section className="flex min-w-0 flex-col gap-2.5">
        <h3 className={ADMIN_CAP}>Motivos</h3>
        {motifsBlocked ? (
          <p className={ADMIN_TEXT_MUTED}>{motifsBlocked}</p>
        ) : hasModels ? (
          <AttributeMatrix product={product} kind="motif" models={models} onChanged={onChanged} />
        ) : (
          <MotifList product={product} onChanged={onChanged} />
        )}
      </section>
    </>
  );
}
