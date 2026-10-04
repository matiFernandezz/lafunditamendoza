// Borrador de un producto nuevo: lo que edita ProductDraftForm, tanto en
// "Nuevo producto" como en un producto nuevo dentro de una compra.

import { UNIVERSAL } from "../compras/purchaseLogic";
import { suggestSku } from "./sku";

export { UNIVERSAL };

// Una fila de la lista: un modelo (y color, si el producto viene en varios).
export type DraftRow = {
  key: string;
  modelId: string;
  color: string;
  /** Stock inicial en "Nuevo producto"; unidades compradas en una compra. */
  quantity: string;
  /** Precio de venta. */
  price: string;
  // Solo en una compra: costo propio de la fila (ver CostFields en purchaseLogic).
  cost: string;
  costTouched: boolean;
  /** La variante ya se guardó (queda bloqueada si después falla otra). */
  savedSku?: string;
};

// Foto elegida pero todavía sin subir: se sube después de crear el producto.
export type DraftPhoto = { key: string; file: File; url: string };

export type ProductDraft = {
  name: string;
  description: string;
  categoryId: string;
  /** "Precio para todos los modelos". */
  bulkPrice: string;
  /** "Costo para todos los modelos" (solo en una compra). */
  bulkCost: string;
  rows: DraftRow[];
  photos: DraftPhoto[];
};

let keySeq = 0;
export function nextKey() {
  keySeq += 1;
  return `k${keySeq}`;
}

export function newDraftRow(price = "", modelId = ""): DraftRow {
  return { key: nextKey(), modelId, color: "", quantity: "", price, cost: "", costTouched: false };
}

export function emptyDraft(name = "", categoryId = ""): ProductDraft {
  return { name, description: "", categoryId, bulkPrice: "", bulkCost: "", rows: [newDraftRow()], photos: [] };
}

export function isBlankRow(row: DraftRow) {
  return row.modelId === "" && row.color.trim() === "" && row.quantity.trim() === "";
}

export function releasePhotos(photos: DraftPhoto[]) {
  for (const photo of photos) URL.revokeObjectURL(photo.url);
}

export function rowLabel(row: { modelId: string; color: string }, modelNameById: Map<string, string>) {
  const model = row.modelId === UNIVERSAL ? "Sin modelo" : modelNameById.get(row.modelId) ?? "";
  return [model, row.color.trim()].filter(Boolean).join(" · ");
}

/**
 * SKU de cada fila nueva: el sugerido por nombre + modelo + color, con un
 * sufijo (-2, -3…) si choca con uno que ya existe. `taken` se va completando:
 * pasando el mismo Set a varias llamadas tampoco se repiten entre productos.
 */
export function assignSkus(
  productName: string,
  rows: { key: string; modelId: string; color: string; savedSku?: string }[],
  taken: Set<string>,
  modelNameById: Map<string, string>,
  into = new Map<string, string>(),
): Map<string, string> {
  for (const row of rows) if (row.savedSku) taken.add(row.savedSku);

  for (const row of rows) {
    if (row.savedSku) {
      into.set(row.key, row.savedSku);
      continue;
    }
    if (productName.trim() === "" || row.modelId === "") continue;
    const modelName = row.modelId === UNIVERSAL ? "" : modelNameById.get(row.modelId) ?? "";
    const base = suggestSku(productName, modelName, row.color) || "SKU";
    let sku = base;
    for (let n = 2; taken.has(sku); n += 1) sku = `${base}-${n}`;
    taken.add(sku);
    into.set(row.key, sku);
  }
  return into;
}
