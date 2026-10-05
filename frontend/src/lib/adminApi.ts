// Llama a los Route Handlers de Next (/app/api/*): son ellos los que
// verifican la sesión de Supabase Auth (requireAdmin) y hablan con la base
// con la secret key, que nunca sale del servidor.

import { PRODUCT_IMAGE_BUCKET } from "@/lib/productImages";
import { createClient } from "@/lib/supabase/client";

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    // Sesión vencida o inexistente: recargar manda al proxy, que redirige a /admin/login.
    window.location.assign("/admin/login");
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AdminApiError(res.status, body?.error ?? `Error ${res.status}`);
  }

  return body as T;
}

export type AdminVariant = {
  id: string;
  sku: string;
  color: string | null;
  price: number;
  cost_price: number;
  stock_quantity: number;
  active: boolean;
  iphone_model_id: string | null;
  /** El color de la variante; null si no tiene o si `color` es una descripción. */
  color_id: string | null;
  /** El motivo (BATMAN…). Una variante tiene color o motivo, nunca los dos. */
  motif_id: string | null;
};

export type AdminProductImage = {
  id: string;
  url: string;
  sort_order: number;
  /** color_id y motif_id null = foto general del producto. */
  color_id: string | null;
  motif_id: string | null;
};

export type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  category_id: string;
  image_url: string | null;
  created_at: string;
  product_variants: AdminVariant[];
  product_images: AdminProductImage[];
};

export function getAdminProducts(): Promise<{ data: AdminProduct[] }> {
  return adminFetch("/api/products");
}

export type SaleItemInput = {
  variant_id: string;
  quantity: number;
  unit_price: number;
};

export type CreateSalePayload = {
  payment_method: "efectivo" | "transferencia";
  channel?: "feria" | "whatsapp" | "web";
  items: SaleItemInput[];
  /** Entero 0-99 sobre el total. El monto lo calcula el backend. */
  discount_percent?: number;
};

export type CreatedSale = {
  id: string;
  sale_date: string;
  payment_method: string;
  channel: string | null;
  /** Precio de lista de todos los items, antes del descuento. */
  subtotal: number;
  /** Lo que realmente se cobró: subtotal - discount_amount. */
  total_amount: number;
  discount_percent: number;
  discount_amount: number;
  notes: string | null;
};

export function createSale(payload: CreateSalePayload): Promise<{ data: CreatedSale }> {
  return adminFetch("/api/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type SaleStatus = "completada" | "anulada";

export type SaleLine = {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  variant: {
    id: string;
    sku: string;
    color: string | null;
    product: { id: string; name: string } | null;
    iphone_model: { id: string; name: string } | null;
  } | null;
};

export type SaleRecord = CreatedSale & {
  status: SaleStatus;
  voided_at: string | null;
  void_reason: string | null;
};

// web_order: la reserva web de la que salió la venta (canal web), si hay.
export type Sale = SaleRecord & { sale_items: SaleLine[]; web_order: { code: string } | null };

export type Pagination = { page: number; page_size: number; total: number; total_pages: number };

/** Rango [from, to) en instantes ISO: el panel lo arma con la hora local del celular. */
export type DateRange = { from: string; to: string };

export function getSales(
  range: DateRange,
  page = 1,
  pageSize = 50,
): Promise<{ data: Sale[]; pagination: Pagination }> {
  const query = new URLSearchParams({ ...range, page: String(page), page_size: String(pageSize) });
  return adminFetch(`/api/sales?${query}`);
}

export type SalesSummary = {
  total_amount: number;
  discount_total: number;
  sales_count: number;
  average_ticket: number;
  by_payment_method: { payment_method: string; total_amount: number; sales_count: number }[];
  top_products: { product_id: string; product_name: string; units: number; revenue: number }[];
};

export function getSalesSummary(range: DateRange): Promise<{ data: SalesSummary }> {
  return adminFetch(`/api/sales/summary?${new URLSearchParams(range)}`);
}

export function voidSale(id: string, reason: string): Promise<{ data: SaleRecord }> {
  return adminFetch(`/api/sales/${id}/void`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export type Supplier = {
  id: string;
  name: string;
  contact_info: string | null;
};

export function getSuppliers(): Promise<{ data: Supplier[] }> {
  return adminFetch("/api/suppliers");
}

export function createSupplier(payload: {
  name: string;
  contact_info?: string;
}): Promise<{ data: Supplier }> {
  return adminFetch("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type PurchaseItemInput = {
  variant_id: string;
  quantity: number;
  unit_cost: number;
};

export type CreatePurchasePayload = {
  supplier_id: string;
  purchase_date?: string;
  items: PurchaseItemInput[];
};

export type CreatedPurchase = {
  id: string;
  supplier_id: string;
  purchase_date: string;
  total_amount: number;
};

export function createPurchase(
  payload: CreatePurchasePayload,
): Promise<{ data: CreatedPurchase }> {
  return adminFetch("/api/purchases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CreatedPurchaseGrid = CreatedPurchase & {
  /** Productos nuevos creados con la compra; `block` es su posición en `products`. */
  created_products: { block: number; id: string; name: string }[];
  created_variants: number;
  updated_prices: number;
};

/**
 * Compra con grilla: varios productos (existentes o nuevos) en una sola
 * transacción. El body lo arma buildPurchasePayload (compras/purchaseLogic).
 */
export function createPurchaseGrid(payload: {
  supplier_id: string;
  purchase_date: string;
  products: unknown[];
}): Promise<{ data: CreatedPurchaseGrid }> {
  return adminFetch("/api/purchases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type LastPurchaseCost = {
  variant_id: string;
  product_id: string;
  unit_cost: number;
  purchase_date: string;
};

/** Último costo de compra por variante, de la compra más nueva a la más vieja. */
export function getLastPurchaseCosts(): Promise<{ data: LastPurchaseCost[] }> {
  return adminFetch("/api/purchases/last-costs");
}

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

export function getAdminCategories(): Promise<{ data: AdminCategory[] }> {
  return adminFetch("/api/categories");
}

export type AdminIphoneModel = {
  id: string;
  name: string;
  sort_order: number;
};

export function getAdminIphoneModels(): Promise<{ data: AdminIphoneModel[] }> {
  return adminFetch("/api/iphone-models");
}

export type CreatedProduct = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  active: boolean;
  image_url: string | null;
};

export function createProduct(payload: {
  category_id: string;
  name: string;
  description?: string;
}): Promise<{ data: CreatedProduct }> {
  return adminFetch("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CreatedVariant = {
  id: string;
  product_id: string;
  iphone_model_id: string | null;
  color: string | null;
  sku: string;
  price: number;
  stock_quantity: number;
};

export function createProductVariant(payload: {
  product_id: string;
  iphone_model_id: string | null;
  color?: string;
  sku: string;
  price: number;
  stock_quantity: number;
}): Promise<{ data: CreatedVariant }> {
  return adminFetch("/api/product-variants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Cambia el stock y/o el precio de una variante. */
export function updateVariant(
  id: string,
  patch: { stock_quantity?: number; price?: number },
): Promise<{ data: AdminVariant }> {
  return adminFetch(`/api/product-variants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Mismo precio para todas las variantes del producto; devuelve las variantes actualizadas. */
export function updateProductPrice(
  productId: string,
  price: number,
): Promise<{ data: AdminVariant[] }> {
  return adminFetch(`/api/products/${productId}/price`, {
    method: "PATCH",
    body: JSON.stringify({ price }),
  });
}

/** Cambia el nombre y/o la descripción. Una descripción vacía la borra. */
export function updateProduct(
  id: string,
  patch: { name?: string; description?: string },
): Promise<{ data: AdminProduct }> {
  return adminFetch(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/**
 * Sube una foto en tres pasos, sin que el archivo pase por nuestro servidor
 * (Vercel limita el tamaño del body): 1) el servidor valida tipo y tamaño y
 * firma la subida, 2) el navegador sube directo a Supabase Storage, 3) el
 * servidor registra la foto en el producto.
 */
export async function addProductImage(
  productId: string,
  file: File,
  group: { colorId?: string | null; motifId?: string | null } = {},
): Promise<{ data: AdminProductImage }> {
  const signed = await adminFetch<{ data: { path: string; token: string } }>(
    `/api/products/${productId}/images/upload-url`,
    {
      method: "POST",
      body: JSON.stringify({ content_type: file.type, size: file.size }),
    },
  );

  const { error } = await createClient()
    .storage.from(PRODUCT_IMAGE_BUCKET)
    .uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: file.type });

  if (error) {
    throw new AdminApiError(500, "No se pudo subir la imagen. Probá de nuevo.");
  }

  return adminFetch(`/api/products/${productId}/images`, {
    method: "POST",
    body: JSON.stringify({ path: signed.data.path, color_id: group.colorId ?? null, motif_id: group.motifId ?? null }),
  });
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await adminFetch(`/api/products/${productId}/images/${imageId}`, { method: "DELETE" });
}

export function reorderProductImages(
  productId: string,
  order: string[],
): Promise<{ data: AdminProductImage[] }> {
  return adminFetch(`/api/products/${productId}/images/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ order }),
  });
}

export type AdminColor = {
  id: string;
  name: string;
  slug: string;
  hex: string;
  /** false = "sin color asignado": todavía tiene el gris por defecto. */
  assigned: boolean;
  sort_order: number;
  variant_count: number;
};

export function getColors(): Promise<{ data: AdminColor[] }> {
  return adminFetch("/api/colors");
}

export function createColor(payload: { name: string; hex: string }): Promise<{ data: AdminColor }> {
  return adminFetch("/api/colors", { method: "POST", body: JSON.stringify(payload) });
}

export function updateColor(
  id: string,
  patch: { name?: string; hex?: string },
): Promise<{ data: Omit<AdminColor, "variant_count"> }> {
  return adminFetch(`/api/colors/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/**
 * Elimina un color sin uso (si está en uso, el servidor responde 409). Con
 * keepText se saca igual ("no es un color") y sus variantes conservan el
 * nombre como descripción libre.
 */
export async function deleteColor(id: string, keepText = false): Promise<void> {
  await adminFetch(`/api/colors/${id}${keepText ? "?keep_text=1" : ""}`, { method: "DELETE" });
}

export type MergeResult = { from: string; into: string; variants: number; merged: number; images: number };

/** "Unir colores": pasa variantes y fotos de `id` a `into` y borra `id`. */
export function mergeColor(id: string, into: string): Promise<{ data: MergeResult }> {
  return adminFetch(`/api/colors/${id}/merge`, { method: "POST", body: JSON.stringify({ into }) });
}

export type ColorToMotifResult = {
  name: string;
  variants: number;
  products: number;
  units: number;
  images: number;
  /** Ya había un motivo con ese nombre (se usa ese; si no, se crea). */
  motif_existed: boolean;
  dry_run: boolean;
};

/**
 * "Pasar a motivo": mueve las variantes y fotos de un color a un motivo con el
 * mismo nombre. El color queda en la lista, sin uso. Con dryRun solo cuenta.
 */
export function colorToMotif(id: string, dryRun = false): Promise<{ data: ColorToMotifResult }> {
  return adminFetch(`/api/colors/${id}/to-motif`, { method: "POST", body: JSON.stringify({ dry_run: dryRun }) });
}

export type AdminMotif = { id: string; name: string; slug: string; sort_order: number; variant_count: number };

export function getMotifs(): Promise<{ data: AdminMotif[] }> {
  return adminFetch("/api/motifs");
}

export function createMotif(name: string): Promise<{ data: AdminMotif }> {
  return adminFetch("/api/motifs", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateMotif(id: string, name: string): Promise<{ data: Omit<AdminMotif, "variant_count"> }> {
  return adminFetch(`/api/motifs/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

export async function deleteMotif(id: string, keepText = false): Promise<void> {
  await adminFetch(`/api/motifs/${id}${keepText ? "?keep_text=1" : ""}`, { method: "DELETE" });
}

export function mergeMotif(id: string, into: string): Promise<{ data: MergeResult }> {
  return adminFetch(`/api/motifs/${id}/merge`, { method: "POST", body: JSON.stringify({ into }) });
}

// --- matriz modelo × color (o motivo) ---------------------------------------------

export type AttributeKind = "color" | "motif";

export type CellsResult = {
  product_id: string;
  product_name: string;
  created: number;
  reactivated: number;
  existing: number;
  /** Primer color/motivo de un producto sin ninguno: se asignó a sus variantes actuales. */
  assigned: number;
  deactivated: number;
  /** Unidades en stock de lo que se da de baja (o de lo asignado). */
  units: number;
  with_stock: { id: string; sku: string; model: string | null; stock: number }[];
  /** Se quiso dar de baja algo con stock sin forzar: no se hizo nada. */
  blocked: boolean;
  skus: string[];
  dry_run: boolean;
};

/**
 * Tilda (active true) o destilda (false) celdas de la matriz de un producto.
 * `models`: ids de modelo; null es la variante sin modelo.
 */
export function applyCells(
  productId: string,
  payload: {
    kind: AttributeKind;
    attrId: string;
    models: (string | null)[];
    active: boolean;
    force?: boolean;
    dryRun?: boolean;
  },
): Promise<{ data: CellsResult }> {
  return adminFetch(`/api/products/${productId}/cells`, {
    method: "POST",
    body: JSON.stringify({
      kind: payload.kind,
      attr_id: payload.attrId,
      models: payload.models,
      active: payload.active,
      force: payload.force ?? false,
      dry_run: payload.dryRun ?? false,
    }),
  });
}

// --- colores de un producto / de una categoría --------------------------------

export type AddColorResult = {
  product_id: string;
  product_name: string;
  /** Variantes nuevas (una por modelo, con stock 0). */
  created: number;
  /** Variantes de ese color que estaban dadas de baja y se reactivaron. */
  reactivated: number;
  /** Variantes de ese color que ya estaban activas. */
  existing: number;
  /**
   * Primer color de un producto que no tenía ninguno: no se crea nada, se le
   * asigna a las variantes que ya tiene (que conservan stock, precio y SKU).
   */
  assigned: number;
  /** Stock de esas variantes asignadas. */
  units: number;
  skus: string[];
  dry_run: boolean;
};

/** Con dryRun devuelve qué pasaría, sin crear nada. */
export function addColorToProduct(
  productId: string,
  colorId: string,
  dryRun = false,
): Promise<{ data: AddColorResult }> {
  return adminFetch(`/api/products/${productId}/colors`, {
    method: "POST",
    body: JSON.stringify({ color_id: colorId, dry_run: dryRun }),
  });
}

export type RemoveColorResult = {
  product_id: string;
  product_name: string;
  /** Variantes activas de ese color. */
  variants: number;
  deactivated: number;
  /** Unidades en stock de esas variantes. */
  units: number;
  with_stock: { id: string; sku: string; model: string | null; stock: number }[];
  /** Hay stock y no se forzó: no se hizo nada. */
  blocked: boolean;
  dry_run: boolean;
};

/** Da de baja las variantes de ese color (no las borra). */
export function removeColorFromProduct(
  productId: string,
  colorId: string,
  options: { force?: boolean; dryRun?: boolean } = {},
): Promise<{ data: RemoveColorResult }> {
  const query = new URLSearchParams();
  if (options.force) query.set("force", "1");
  if (options.dryRun) query.set("dry_run", "1");
  return adminFetch(`/api/products/${productId}/colors/${colorId}?${query}`, { method: "DELETE" });
}

export type AddColorToCategoryResult = {
  category_name: string;
  /** Productos a los que se les creó o reactivó alguna variante. */
  products: number;
  created: number;
  reactivated: number;
  existing: number;
  changed: Omit<AddColorResult, "dry_run">[];
  skipped: { product_id: string; product_name: string; reason: string }[];
  dry_run: boolean;
};

/** `modelIds` null = todos los modelos de cada producto. */
export function addColorToCategory(
  categoryId: string,
  colorId: string,
  dryRun = false,
  modelIds: string[] | null = null,
): Promise<{ data: AddColorToCategoryResult }> {
  return adminFetch(`/api/categories/${categoryId}/colors`, {
    method: "POST",
    body: JSON.stringify({ color_id: colorId, dry_run: dryRun, ...(modelIds ? { model_ids: modelIds } : {}) }),
  });
}

export type RemoveColorFromCategoryResult = {
  category_name: string;
  products: number;
  deactivated: number;
  /** Variantes con stock: no se dan de baja en bloque. */
  omitted: { product_id: string; product_name: string; sku: string; model: string | null; stock: number }[];
  omitted_units: number;
  dry_run: boolean;
};

export function removeColorFromCategory(
  categoryId: string,
  colorId: string,
  dryRun = false,
  modelIds: string[] | null = null,
): Promise<{ data: RemoveColorFromCategoryResult }> {
  const query = new URLSearchParams();
  if (dryRun) query.set("dry_run", "1");
  if (modelIds) query.set("models", modelIds.join(","));
  return adminFetch(`/api/categories/${categoryId}/colors/${colorId}?${query}`, { method: "DELETE" });
}

export type WebOrderStatus = "pendiente" | "pagada" | "cancelada";

export type WebOrder = {
  id: string;
  code: string;
  public_token: string;
  customer_name: string;
  customer_phone: string;
  status: WebOrderStatus;
  total_amount: number;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  sale_id: string | null;
  items: {
    id: string;
    quantity: number;
    unit_price: number;
    variant: SaleLine["variant"];
  }[];
};

export function getWebOrders(status: WebOrderStatus): Promise<{ data: WebOrder[] }> {
  return adminFetch(`/api/web-orders?status=${status}`);
}

export function getWebOrderCounts(): Promise<{ data: Record<WebOrderStatus, number> }> {
  return adminFetch("/api/web-orders/counts");
}

export function markWebOrderPaid(id: string): Promise<{ data: WebOrder }> {
  return adminFetch(`/api/web-orders/${id}/paid`, { method: "POST" });
}

export function cancelWebOrder(id: string, reason: string | null): Promise<{ data: WebOrder }> {
  return adminFetch(`/api/web-orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
