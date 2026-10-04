// Lógica de la compra con grilla, sin React y sin imports de valores: la usa la
// pantalla y también `scripts/test-compras.mjs`, que la importa directo con Node.

import type { DraftRow, ProductDraft } from "../productos/productDraft";

/** Valor del selector de modelo para "Sin modelo (sirve para todos)". */
export const UNIVERSAL = "__universal__";

/** El precio sugerido se redondea al múltiplo más cercano de este valor. */
export const PRICE_ROUNDING = 100;

/** Lo que tiene toda fila de la grilla, sea de un producto existente o nuevo. */
export type CostFields = {
  quantity: string;
  /** Costo propio de la fila; solo vale si costTouched. */
  cost: string;
  /** false: la fila sigue al campo "Costo para todos". */
  costTouched: boolean;
};

export type ExistingRow = CostFields & {
  key: string;
  /** null: variante que todavía no existe ("Agregar modelo"). */
  variantId: string | null;
  /** "", UNIVERSAL o el id del modelo. */
  modelId: string;
  color: string;
  currentStock: number | null;
  currentPrice: number | null;
  /** Costo de la última compra de esta variante. */
  prevCost: number | null;
  /** Variante descontinuada: se puede comprar igual, pero se avisa. */
  inactive?: boolean;
};

export type ExistingBlock = {
  kind: "existing";
  key: string;
  productId: string;
  name: string;
  bulkCost: string;
  /** "Actualizar precio de venta": vacío = no se toca ningún precio. */
  newSalePrice: string;
  /** Costo de la última compra del producto (para las variantes nuevas). */
  productPrevCost: number | null;
  rows: ExistingRow[];
};

export type NewBlock = { kind: "new"; key: string; draft: ProductDraft };

export type PurchaseBlock = ExistingBlock | NewBlock;

// --- números -----------------------------------------------------------------

/** vacía o 0: la fila se ignora · valid: entero > 0 · invalid: negativa o con decimales. */
export function quantityState(text: string): "empty" | "valid" | "invalid" {
  if (text.trim() === "") return "empty";
  const n = Number(text);
  if (n === 0) return "empty";
  return Number.isInteger(n) && n > 0 ? "valid" : "invalid";
}

export function parseQuantity(text: string): number | null {
  return quantityState(text) === "valid" ? Number(text) : null;
}

/** Monto mayor a 0, o null. */
export function parseMoney(text: string): number | null {
  const n = Number(text);
  return text.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

/** El costo que vale para la fila: el propio si lo editó a mano, si no el "para todos". */
export function effectiveCost(row: CostFields, bulkCost: string): string {
  return row.costTouched ? row.cost : bulkCost;
}

function blockBulkCost(block: PurchaseBlock): string {
  return block.kind === "new" ? block.draft.bulkCost : block.bulkCost;
}

function blockRows(block: PurchaseBlock): (ExistingRow | DraftRow)[] {
  return block.kind === "new" ? block.draft.rows : block.rows;
}

// --- resumen -----------------------------------------------------------------

/** Productos con al menos una fila cargada, unidades y costo total (cantidad × costo). */
export function summarize(blocks: PurchaseBlock[]): { products: number; units: number; total: number } {
  let products = 0;
  let units = 0;
  let total = 0;
  for (const block of blocks) {
    const bulk = blockBulkCost(block);
    let blockUnits = 0;
    for (const row of blockRows(block)) {
      const quantity = parseQuantity(row.quantity);
      if (quantity === null) continue;
      blockUnits += quantity;
      total += quantity * (parseMoney(effectiveCost(row, bulk)) ?? 0);
    }
    if (blockUnits > 0) products += 1;
    units += blockUnits;
  }
  return { products, units, total };
}

// --- precio de venta y margen -------------------------------------------------

/** Precio actual del producto: el más repetido entre sus variantes (si empatan, el más alto). */
export function referencePrice(block: ExistingBlock): number | null {
  const counts = new Map<number, number>();
  for (const row of block.rows) {
    if (row.variantId !== null && row.currentPrice !== null) {
      counts.set(row.currentPrice, (counts.get(row.currentPrice) ?? 0) + 1);
    }
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [price, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && price > best)) {
      best = price;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Precio de venta con el que nace una variante nueva de un producto existente:
 * el de "Actualizar precio de venta" si está cargado, si no el actual del producto.
 */
export function newVariantPrice(block: ExistingBlock): number | null {
  return parseMoney(block.newSalePrice) ?? referencePrice(block);
}

export function roundPrice(price: number): number {
  return Math.round(price / PRICE_ROUNDING) * PRICE_ROUNDING;
}

/**
 * "Mantener mi margen de antes": costo nuevo × (precio actual / costo anterior),
 * redondeado. null si falta algún dato o el costo no cambió.
 */
export function suggestPrice(newCost: number | null, currentPrice: number | null, prevCost: number | null): number | null {
  if (newCost === null || currentPrice === null || prevCost === null) return null;
  if (newCost <= 0 || currentPrice <= 0 || prevCost <= 0 || newCost === prevCost) return null;
  return roundPrice(newCost * (currentPrice / prevCost));
}

/** Ganancia por unidad: en pesos y en % sobre el costo. */
export function unitGain(price: number, cost: number): { amount: number; percent: number } {
  const amount = price - cost;
  return { amount, percent: cost > 0 ? (amount / cost) * 100 : 0 };
}

export type Range = { min: number; max: number };

function rangeOf(values: number[]): Range | null {
  return values.length === 0 ? null : { min: Math.min(...values), max: Math.max(...values) };
}

export type BlockPricing = {
  /** Precio de venta actual de las variantes existentes. */
  price: Range | null;
  prevCost: Range | null;
  /** Ganancia por unidad con el costo cargado (y el precio nuevo, si se cargó). */
  gain: Range | null;
  gainPercent: Range | null;
  /** Precio sugerido para mantener el margen; null si no aplica. */
  suggestion: number | null;
  /** El costo cambió pero las filas darían precios sugeridos distintos. */
  suggestionVaries: boolean;
};

/**
 * Números del bloque. Se calculan sobre las filas con cantidad; si todavía no
 * hay ninguna, sobre todas (así el margen se ve apenas se carga el costo).
 */
export function blockPricing(block: ExistingBlock): BlockPricing {
  const reference = referencePrice(block);
  const newPrice = parseMoney(block.newSalePrice);
  const purchased = block.rows.filter((row) => parseQuantity(row.quantity) !== null);
  const rows = purchased.length > 0 ? purchased : block.rows;

  const prevCosts: number[] = [];
  const gains: number[] = [];
  const percents: number[] = [];
  const suggestions = new Set<number>();

  for (const row of rows) {
    const prev = row.variantId !== null ? row.prevCost : block.productPrevCost;
    const price = row.variantId !== null ? row.currentPrice : reference;
    const cost = parseMoney(effectiveCost(row, block.bulkCost));
    if (prev !== null) prevCosts.push(prev);

    const sellAt = newPrice ?? price;
    if (cost !== null && sellAt !== null) {
      const gain = unitGain(sellAt, cost);
      gains.push(gain.amount);
      percents.push(gain.percent);
    }

    const suggested = suggestPrice(cost, price, prev);
    if (suggested !== null) suggestions.add(suggested);
  }

  return {
    price: rangeOf(block.rows.flatMap((row) => (row.variantId !== null && row.currentPrice !== null ? [row.currentPrice] : []))),
    prevCost: rangeOf(prevCosts),
    gain: rangeOf(gains),
    gainPercent: rangeOf(percents),
    suggestion: suggestions.size === 1 ? [...suggestions][0] : null,
    suggestionVaries: suggestions.size > 1,
  };
}

// --- costo anterior -----------------------------------------------------------

export type LastCost = { variant_id: string; product_id: string; unit_cost: number };

/** `rows` viene de la compra más nueva a la más vieja (GET /api/purchases/last-costs). */
export function indexLastCosts(rows: LastCost[]) {
  const byVariant = new Map<string, number>();
  const byProduct = new Map<string, number>();
  for (const row of rows) {
    if (!byVariant.has(row.variant_id)) byVariant.set(row.variant_id, row.unit_cost);
    if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, row.unit_cost);
  }
  return { byVariant, byProduct };
}

type LastCostIndex = ReturnType<typeof indexLastCosts>;

/** Sin compras registradas se usa el costo guardado en la variante, si tiene. */
export function variantPrevCost(variant: { id: string; cost_price: number }, index: LastCostIndex): number | null {
  return index.byVariant.get(variant.id) ?? (variant.cost_price > 0 ? variant.cost_price : null);
}

export function productPrevCost(
  productId: string,
  variants: { id: string; cost_price: number }[],
  index: LastCostIndex,
): number | null {
  const known = index.byProduct.get(productId);
  if (known !== undefined) return known;
  const costs = variants.map((v) => v.cost_price).filter((c) => c > 0);
  return costs.length > 0 ? Math.max(...costs) : null;
}

// --- fecha dd/mm/aaaa ---------------------------------------------------------

export function formatArDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/** "05/10/2026" (o "5-10-2026") -> "2026-10-05". null si no es una fecha real. */
export function parseArDate(text: string): string | null {
  const match = /^\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s*$/.exec(text);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Va armando dd/mm/aaaa mientras se tipean solo números (teclado numérico del celular). */
export function maskArDate(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

// --- validación ---------------------------------------------------------------

export type PurchaseForm = {
  supplierId: string;
  /** dd/mm/aaaa */
  date: string;
  blocks: PurchaseBlock[];
};

/**
 * Qué falta para poder registrar. `invalid` trae los campos a marcar en rojo
 * ("supplier", "date", "<bloque>:name", "<fila>:cost"…) y `message` un solo
 * aviso: el del primer problema. Las filas sin cantidad no se miran.
 */
export function validatePurchase(
  form: PurchaseForm,
  existingProductNames: string[],
): { message: string | null; invalid: Set<string> } {
  const invalid = new Set<string>();
  let message: string | null = null;
  const fail = (field: string, text: string) => {
    invalid.add(field);
    message ??= text;
  };

  if (form.supplierId === "") fail("supplier", "Elegí un proveedor.");
  if (parseArDate(form.date) === null) fail("date", "La fecha tiene que ser dd/mm/aaaa.");

  const takenNames = new Set(existingProductNames.map((n) => n.trim().toLowerCase()));
  let purchasedRows = 0;

  for (const block of form.blocks) {
    const bulk = blockBulkCost(block);
    const name = block.kind === "new" ? block.draft.name.trim() : block.name;
    const label = name === "" ? "el producto nuevo" : name;
    const rows = blockRows(block);
    const purchased = rows.filter((row) => quantityState(row.quantity) !== "empty");

    if (block.kind === "new") {
      if (name === "") {
        fail(`${block.key}:name`, "Poné el nombre del producto nuevo.");
      } else if (takenNames.has(name.toLowerCase())) {
        fail(`${block.key}:name`, `Ya existe un producto llamado "${name}".`);
      }
      takenNames.add(name.toLowerCase());
      if (block.draft.categoryId === "") fail(`${block.key}:category`, `Elegí la categoría de ${label}.`);
      if (purchased.length === 0) fail(`${block.key}:rows`, `Cargá la cantidad de al menos un modelo de ${label}.`);
    } else if (block.newSalePrice.trim() !== "" && parseMoney(block.newSalePrice) === null) {
      fail(`${block.key}:salePrice`, `El nuevo precio de venta de ${label} tiene que ser mayor a 0.`);
    }

    // Modelo + color ya usados en el producto: una variante nueva no los puede repetir.
    const combos = new Set<string>();
    const combo = (row: ExistingRow | DraftRow) => `${row.modelId}|${row.color.trim().toLowerCase()}`;
    if (block.kind === "existing") {
      for (const row of block.rows) if (row.variantId !== null) combos.add(combo(row));
    }

    for (const row of purchased) {
      purchasedRows += 1;
      if (quantityState(row.quantity) === "invalid") {
        fail(`${row.key}:quantity`, `${label}: la cantidad tiene que ser un entero mayor a 0.`);
      }
      if (parseMoney(effectiveCost(row, bulk)) === null) {
        // Si la fila sigue al "Costo para todos", el campo a completar es ese.
        fail(row.costTouched ? `${row.key}:cost` : `${block.key}:bulkCost`, `${label}: falta el costo (mayor a 0).`);
        if (!row.costTouched) invalid.add(`${row.key}:cost`);
      }

      const isNewVariant = block.kind === "new" || (row as ExistingRow).variantId === null;
      if (!isNewVariant) continue;

      if (row.modelId === "") {
        fail(`${row.key}:model`, `${label}: elegí el modelo de la fila nueva.`);
      } else if (combos.has(combo(row))) {
        fail(`${row.key}:model`, `${label}: ese modelo y color ya está en la lista.`);
      }
      combos.add(combo(row));

      if (block.kind === "new") {
        if (parseMoney((row as DraftRow).price) === null) {
          fail(`${row.key}:price`, `${label}: falta el precio de venta (mayor a 0).`);
        }
      } else if (newVariantPrice(block) === null) {
        fail(`${block.key}:salePrice`, `${label}: poné el precio de venta para el modelo nuevo.`);
      }
    }
  }

  if (purchasedRows === 0 && message === null) {
    fail("rows", form.blocks.length === 0 ? "Agregá un producto a la compra." : "Cargá la cantidad de al menos un modelo.");
  } else if (purchasedRows === 0) {
    invalid.add("rows");
  }

  return { message, invalid };
}

// --- payload ------------------------------------------------------------------

type PayloadRow =
  | { variant_id: string; quantity: number; unit_cost: number }
  | { iphone_model_id: string | null; color?: string; sku: string; price: number; quantity: number; unit_cost: number };

type PayloadBlock =
  | { product_id: string; new_sale_price?: number; rows: PayloadRow[] }
  | { new_product: { category_id: string; name: string; description?: string }; rows: PayloadRow[] };

export type PurchasePayload = {
  supplier_id: string;
  purchase_date: string;
  products: PayloadBlock[];
};

/**
 * Arma el body de POST /api/purchases. Las filas con cantidad vacía o 0 no
 * viajan, y un producto existente sin ninguna fila cargada tampoco.
 * `blockKeys[i]` es el bloque de la pantalla que originó `products[i]`.
 */
export function buildPurchasePayload(
  form: PurchaseForm,
  skuByKey: Map<string, string>,
): { payload: PurchasePayload; blockKeys: string[] } {
  const products: PayloadBlock[] = [];
  const blockKeys: string[] = [];

  for (const block of form.blocks) {
    const bulk = blockBulkCost(block);
    const rows: PayloadRow[] = [];

    for (const row of blockRows(block)) {
      const quantity = parseQuantity(row.quantity);
      if (quantity === null) continue;
      const unit_cost = parseMoney(effectiveCost(row, bulk)) ?? 0;

      if (block.kind === "existing" && (row as ExistingRow).variantId !== null) {
        rows.push({ variant_id: (row as ExistingRow).variantId as string, quantity, unit_cost });
        continue;
      }

      const price = block.kind === "new" ? parseMoney((row as DraftRow).price) : newVariantPrice(block);
      const color = row.color.trim();
      rows.push({
        iphone_model_id: row.modelId === UNIVERSAL ? null : row.modelId,
        ...(color ? { color } : {}),
        sku: skuByKey.get(row.key) ?? "",
        price: price ?? 0,
        quantity,
        unit_cost,
      });
    }

    if (rows.length === 0) continue;

    if (block.kind === "new") {
      const description = block.draft.description.trim();
      products.push({
        new_product: {
          category_id: block.draft.categoryId,
          name: block.draft.name.trim(),
          ...(description ? { description } : {}),
        },
        rows,
      });
    } else {
      const newSalePrice = parseMoney(block.newSalePrice);
      products.push({
        product_id: block.productId,
        ...(newSalePrice !== null ? { new_sale_price: newSalePrice } : {}),
        rows,
      });
    }
    blockKeys.push(block.key);
  }

  return {
    payload: { supplier_id: form.supplierId, purchase_date: parseArDate(form.date) ?? "", products },
    blockKeys,
  };
}
