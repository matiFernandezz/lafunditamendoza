import type { AdminProduct } from "@/lib/adminApi";

/**
 * Cambios sin guardar de un producto en Catálogo. Solo guarda lo que se tocó:
 * un campo que no está acá vale lo que tiene el producto.
 */
export type CatalogDraft = {
  name?: string;
  description?: string;
  /** Texto del input por id de variante. */
  stock: Record<string, string>;
  price: Record<string, string>;
};

export const EMPTY_DRAFT: CatalogDraft = { stock: {}, price: {} };

export type VariantPatch = { id: string; stock_quantity?: number; price?: number };

/**
 * Qué hay que guardar: lo que difiere de lo guardado. `invalid` trae los
 * campos mal cargados ("name", "<variante>:stock", "<variante>:price") y
 * `count` cuántos campos cambiaron.
 */
export function draftChanges(product: AdminProduct, draft: CatalogDraft) {
  const invalid = new Set<string>();
  const productPatch: { name?: string; description?: string } = {};

  if (draft.name !== undefined) {
    const name = draft.name.trim();
    if (name === "") invalid.add("name");
    else if (name !== product.name) productPatch.name = name;
  }
  if (draft.description !== undefined && draft.description.trim() !== (product.description ?? "").trim()) {
    productPatch.description = draft.description;
  }

  const variants: VariantPatch[] = [];
  let count = Object.keys(productPatch).length;

  for (const variant of product.product_variants) {
    const patch: VariantPatch = { id: variant.id };

    const stockText = draft.stock[variant.id];
    if (stockText !== undefined) {
      const stock = Number(stockText);
      if (stockText.trim() === "" || !Number.isInteger(stock) || stock < 0) invalid.add(`${variant.id}:stock`);
      else if (stock !== variant.stock_quantity) patch.stock_quantity = stock;
    }

    const priceText = draft.price[variant.id];
    if (priceText !== undefined) {
      const price = Number(priceText);
      if (priceText.trim() === "" || !Number.isFinite(price) || price <= 0) invalid.add(`${variant.id}:price`);
      else if (price !== variant.price) patch.price = price;
    }

    const fields = Object.keys(patch).length - 1;
    if (fields > 0) {
      variants.push(patch);
      count += fields;
    }
  }

  return { productPatch, variants, invalid, count, dirty: count > 0 || invalid.size > 0 };
}
