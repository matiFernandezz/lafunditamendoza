// Llama a los Route Handlers de Next (/app/api/*): son ellos los que
// verifican la sesión de Supabase Auth (requireAdmin) y hablan con la base
// con la secret key, que nunca sale del servidor.

import type { SlideLayout } from "./slideLayout";
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
  /** Modelos que comparten stock: mismo group_no = las variantes del mismo color van juntas. */
  product_stock_links: { iphone_model_id: string; group_no: number }[];
  /** true: sus grupos se pusieron a mano (excepción); false: sigue la regla general. */
  stock_groups_custom: boolean;
};

export function getAdminProducts(): Promise<{ data: AdminProduct[] }> {
  return adminFetch("/api/products");
}

export type StockGroupsResult = {
  groups: number;
  /** Variantes cuyo stock cambia al armar los grupos (todas al más alto de su color). */
  changes: { id: string; sku: string; from: number; to: number }[];
  /** Variantes que se crean porque a un modelo del grupo le faltaba ese color o diseño. */
  created: { model: string; label: string; stock: number }[];
  dry_run: boolean;
};

/** Una parte de un combo: qué producto (y de qué color o diseño) va en cada diseño del combo. */
export type BundleSpec = {
  bundle_color_id: string | null;
  bundle_motif_id: string | null;
  component_product_id: string;
  component_color_id: string | null;
  component_motif_id: string | null;
  quantity: number;
};

/** Cómo quedó armada una variante del combo. */
export type BundleReportRow = {
  id: string;
  sku: string;
  model: string | null;
  label: string | null;
  stock: number;
  parts: {
    product: string | null;
    sku: string | null;
    model: string | null;
    label: string | null;
    stock: number | null;
    missing: boolean;
    quantity: number;
  }[];
};

export function getBundle(productId: string): Promise<{ data: { specs: BundleSpec[]; report: BundleReportRow[] } }> {
  return adminFetch(`/api/products/${productId}/bundle`);
}

/** Guarda las partes del combo ([] = deja de ser combo) y devuelve cómo quedó cada variante. */
export function setBundle(productId: string, specs: BundleSpec[]): Promise<{ data: BundleReportRow[] }> {
  return adminFetch(`/api/products/${productId}/bundle`, { method: "PUT", body: JSON.stringify({ specs }) });
}

/** La regla general de stock compartido guardada (grupos de ids de modelo). */
export function getStockRule(): Promise<{ data: string[][] }> {
  return adminFetch("/api/stock-groups");
}

/** Guarda la regla general y la aplica a todos los productos que no son excepción. */
export function setAllStockGroups(
  groups: string[][],
  dryRun = false,
): Promise<{ data: { products: number; changes: number; created: number; dry_run: boolean } }> {
  return adminFetch(`/api/stock-groups${dryRun ? "?dry_run=1" : ""}`, {
    method: "PUT",
    body: JSON.stringify({ groups }),
  });
}

/**
 * Grupos de un producto puestos a mano (queda como excepción a la regla; []
 * = ningún modelo comparte). null lo vuelve a la regla general.
 */
export function setProductStockGroups(
  productId: string,
  groups: string[][] | null,
  dryRun = false,
): Promise<{ data: StockGroupsResult }> {
  return adminFetch(`/api/products/${productId}/stock-groups${dryRun ? "?dry_run=1" : ""}`, {
    method: "PUT",
    body: JSON.stringify({ groups }),
  });
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
  /** Nombre del cliente, opcional. */
  customer_name?: string | null;
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
  customer_name: string | null;
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
  /** Costo de la variante al momento de la venta (para la ganancia). */
  unit_cost: number;
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
  status?: SaleStatus,
): Promise<{ data: Sale[]; pagination: Pagination }> {
  const query = new URLSearchParams({ ...range, page: String(page), page_size: String(pageSize) });
  if (status) query.set("status", status);
  return adminFetch(`/api/sales?${query}`);
}

export type SalesSummary = {
  total_amount: number;
  discount_total: number;
  sales_count: number;
  average_ticket: number;
  /** Lo cobrado menos el costo de lo vendido. */
  gross_profit: number;
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
  /** Cómo se le paga ("Transferencia", "USDT"…). */
  payment_method: string | null;
  /** Envío estimado de un pedido: se propone al cargar uno nuevo. */
  shipping_cost: number;
  notes: string | null;
};

/** Proveedor con lo que se le compró (lista de Proveedores). */
export type SupplierWithStats = Supplier & {
  purchases_count: number;
  /** Mercadería + envío de los pedidos ya pagados. */
  total_paid: number;
  last_purchase_date: string | null;
};

export type SupplierInput = {
  name: string;
  contact_info?: string | null;
  payment_method?: string | null;
  shipping_cost?: number;
  notes?: string | null;
};

export function updateSupplier(id: string, patch: Partial<SupplierInput>): Promise<{ data: Supplier }> {
  return adminFetch(`/api/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function getSuppliers(): Promise<{ data: SupplierWithStats[] }> {
  return adminFetch("/api/suppliers");
}

export function createSupplier(payload: SupplierInput): Promise<{ data: Supplier }> {
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
  number: number;
  supplier_id: string;
  purchase_date: string;
  total_amount: number;
};

export function createPurchase(payload: CreatePurchasePayload): Promise<{ data: CreatedPurchase }> {
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
  status?: PurchaseStatus;
  shipping_cost?: number;
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

/** Qué distingue a las variantes de una categoría: color, diseño (motif) o nada. */
export type VariantKind = "color" | "motif" | "none";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  /** null = hereda de la categoría de arriba (ver resolveCategorySettings). */
  variant_kind: VariantKind | null;
  /** true = una variante por modelo de iPhone; false = universal; null = hereda. */
  by_model: boolean | null;
  /** Foto de su mosaico en la home (null = sin foto). */
  home_image_url: string | null;
};

export function updateCategory(
  id: string,
  patch: { variant_kind?: VariantKind | null; by_model?: boolean | null; home_image_url?: string | null },
): Promise<{ data: AdminCategory }> {
  return adminFetch(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

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
export function updateProductPrice(productId: string, price: number): Promise<{ data: AdminVariant[] }> {
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

export function reorderProductImages(productId: string, order: string[]): Promise<{ data: AdminProductImage[] }> {
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

export type AttributeKind = "color" | "motif";

// --- agregar y eliminar variantes ------------------------------------------------

export type AddVariantsResult = AddColorResult & {
  /** Modelos en los que la combinación ya existía activa (no se duplicó). */
  already: string[];
  dry_run: boolean;
};

/**
 * "Agregar variante": una variante por modelo elegido (null = universal). Si
 * la combinación estaba archivada, se reactiva; si ya existe, no se duplica.
 */
export function addVariants(
  productId: string,
  payload: {
    kind: AttributeKind | "text";
    attrId?: string | null;
    text?: string;
    models: (string | null)[];
    stock: number;
    price?: number | null;
    sku?: string;
    dryRun?: boolean;
  },
): Promise<{ data: AddVariantsResult }> {
  return adminFetch(`/api/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify({
      kind: payload.kind,
      attr_id: payload.attrId ?? null,
      text: payload.text ?? null,
      models: payload.models,
      stock: payload.stock,
      price: payload.price ?? null,
      sku: payload.sku ?? null,
      dry_run: payload.dryRun ?? false,
    }),
  });
}

export type DeleteVariantResult = {
  id: string;
  sku: string;
  /** Unidades en stock de la variante (se pierden al eliminarla). */
  units: number;
  references: number;
  /** Tenía stock y no se confirmó: no se hizo nada. */
  blocked: boolean;
  /** Se borró del todo (no tenía historial). */
  deleted: boolean;
  /** Tenía ventas, compras o reservas: quedó solo en el historial. */
  archived: boolean;
  dry_run: boolean;
};

export function deleteVariant(id: string, force = false): Promise<{ data: DeleteVariantResult }> {
  return adminFetch(`/api/product-variants/${id}${force ? "?force=1" : ""}`, { method: "DELETE" });
}

export type DeleteProductResult = Omit<DeleteVariantResult, "sku"> & { name: string };

/** dryRun: solo averigua qué pasaría (stock que se pierde, si tiene historial). */
export function deleteProduct(
  id: string,
  { force = false, dryRun = false } = {},
): Promise<{ data: DeleteProductResult }> {
  const query = new URLSearchParams();
  if (force) query.set("force", "1");
  if (dryRun) query.set("dry_run", "1");
  const qs = query.toString();
  return adminFetch(`/api/products/${id}${qs ? `?${qs}` : ""}`, { method: "DELETE" });
}

// --- colores de una categoría ---------------------------------------------------

/** Resumen de lo que se le hizo a un producto al agregarle variantes. */
export type AddColorResult = {
  product_id: string;
  product_name: string;
  created: number;
  reactivated: number;
  existing: number;
  assigned: number;
  units: number;
  skus: string[];
};

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

/** El stock entra recién en "recibida". */
export type PurchaseStatus = "armando" | "pagado" | "en_camino" | "recibida";

type PurchaseBase = {
  id: string;
  /** Pedido 1, 2, 3… */
  number: number;
  purchase_date: string;
  created_at: string;
  status: PurchaseStatus;
  /** Mercadería, sin el envío. */
  total_amount: number;
  shipping_cost: number;
  paid_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  notes: string | null;
};

export type PurchaseSummary = PurchaseBase & { supplier: { id: string; name: string } | null; units: number };

export type PurchaseLine = {
  id: string;
  quantity: number;
  unit_cost: number;
  variant: {
    id: string;
    sku: string;
    color: string | null;
    /** Precio de venta actual. */
    price: number;
    stock_quantity: number;
    product: { id: string; name: string } | null;
    iphone_model: { id: string; name: string } | null;
  } | null;
};

export type Purchase = PurchaseBase & { supplier: Supplier | null; purchase_items: PurchaseLine[] };

export function getPurchases(): Promise<{ data: PurchaseSummary[] }> {
  return adminFetch("/api/purchases");
}

export function getPurchase(id: string): Promise<{ data: Purchase }> {
  return adminFetch(`/api/purchases/${id}`);
}

/** Estado, envío o notas. Pasar a "recibida" suma el stock. */
export function updatePurchase(
  id: string,
  patch: { status?: PurchaseStatus; shipping_cost?: number; notes?: string | null },
): Promise<{ data: Purchase }> {
  return adminFetch(`/api/purchases/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/** Solo pedidos que todavía no llegaron. */
export async function deletePurchase(id: string): Promise<void> {
  await adminFetch(`/api/purchases/${id}`, { method: "DELETE" });
}

export type StockAlert = {
  id: string;
  name: string;
  stock: number;
  variants: number;
  empty_variants: number;
  kind: "sin_stock" | "poco_stock" | "modelos";
};

export type DashboardPurchase = {
  id: string;
  number: number;
  purchase_date: string;
  created_at: string;
  total_amount: number;
  shipping_cost: number;
  status: PurchaseStatus;
  received_at: string | null;
  supplier_name: string;
  units: number;
};

export type Dashboard = {
  sales: { total_amount: number; sales_count: number; gross_profit: number; prev_total_amount: number };
  /** bucket: hora local "2026-10-20T15:00" (si el período es un día) o día "2026-10-20T00:00". */
  series: { unit: "hour" | "day"; points: { bucket: string; total_amount: number; sales_count: number }[] };
  /** Histórico: lo cobrado por medio de pago y lo pagado en pedidos. */
  cash: { efectivo: number; transferencia: number; purchases: number };
  stock: { cost_value: number; retail_value: number; units: number; without_cost: number };
  alerts: {
    out_of_stock: number;
    low_stock: number;
    missing_models: number;
    products: StockAlert[];
    web_pending: number;
    purchases_on_the_way: number;
  };
  purchases: DashboardPurchase[];
};

export function getDashboard(params: DateRange & { prev_from: string; prev_to: string; tz: string }): Promise<{
  data: Dashboard;
}> {
  return adminFetch(`/api/dashboard?${new URLSearchParams(params)}`);
}

// ---------------------------------------------------------------------------
// Tienda: carrusel, fotos de categorías y "Nuevos ingresos" de la home.
// ---------------------------------------------------------------------------

/** Sube una foto de la tienda directo a Storage y devuelve su URL pública. */
export async function uploadStoreImage(file: Blob, contentType: string): Promise<string> {
  const signed = await adminFetch<{ data: { path: string; token: string; public_url: string } }>(
    "/api/store/upload-url",
    { method: "POST", body: JSON.stringify({ content_type: contentType, size: file.size }) },
  );
  const { error } = await createClient()
    .storage.from(PRODUCT_IMAGE_BUCKET)
    .uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType });
  if (error) throw new AdminApiError(500, "No se pudo subir la imagen. Probá de nuevo.");
  return signed.data.public_url;
}

export type HomeSlideKind = "rango" | "titulo" | "logo" | "foto";

export type HomeSlide = {
  id: string;
  sort_order: number;
  image_url: string;
  /** Foto propia para el celular (vertical 4:5); null = recorta la de computadora. */
  mobile_image_url: string | null;
  alt: string;
  kind: HomeSlideKind;
  label: string | null;
  title: string | null;
  /** Bajada del rango de modelos (null = la de siempre). */
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  position: string | null;
  /** Encuadre en el celular (null = el mismo que en computadora). */
  position_mobile: string | null;
  dim: number | null;
  /** Tamaño del texto (null = automático). */
  text_size: HomeSlideTextSize | null;
  text_position: HomeSlideTextPosition | null;
  /** Dónde va el logo (null = sin logo; en el tipo "logo", abajo a la izquierda). */
  logo_position: HomeSlideTextPosition | null;
  /** Tamaño del logo (null = mediano, el de siempre). */
  logo_size: HomeSlideTextSize | null;
  /** Diseño del editor, por dispositivo (null = el carrusel de antes). */
  layout: SlideLayout | null;
};

export type HomeSlideTextSize = "chico" | "mediano" | "grande";
export type HomeSlideTextPosition = `${"arriba" | "centro" | "abajo"}-${"izquierda" | "centro" | "derecha"}`;

export type HomeSlideInput = Partial<Omit<HomeSlide, "id" | "sort_order">>;

export function getHomeSlides(): Promise<{ data: HomeSlide[] }> {
  return adminFetch("/api/store/slides");
}

export function createHomeSlide(input: HomeSlideInput & { image_url: string }): Promise<{ data: HomeSlide }> {
  return adminFetch("/api/store/slides", { method: "POST", body: JSON.stringify(input) });
}

export function updateHomeSlide(id: string, patch: HomeSlideInput): Promise<{ data: HomeSlide }> {
  return adminFetch(`/api/store/slides/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteHomeSlide(id: string): Promise<void> {
  await adminFetch(`/api/store/slides/${id}`, { method: "DELETE" });
}

export async function reorderHomeSlides(ids: string[]): Promise<void> {
  await adminFetch("/api/store/slides/reorder", { method: "POST", body: JSON.stringify({ ids }) });
}

export type NewArrival = {
  id: string;
  sort_order: number;
  image_url: string;
  edge_color: string;
  product_id: string;
  product: { id: string; name: string; active: boolean } | null;
  /** Precio más bajo con stock (null = sin stock: no se ve en la home). */
  price: number | null;
  units: number;
};

export function getNewArrivals(): Promise<{ data: NewArrival[] }> {
  return adminFetch("/api/store/new-arrivals");
}

export function createNewArrival(input: {
  product_id: string;
  image_url: string;
  edge_color: string;
}): Promise<{ data: NewArrival }> {
  return adminFetch("/api/store/new-arrivals", { method: "POST", body: JSON.stringify(input) });
}

export function updateNewArrival(
  id: string,
  patch: { image_url?: string; edge_color?: string },
): Promise<{ data: NewArrival }> {
  return adminFetch(`/api/store/new-arrivals/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteNewArrival(id: string): Promise<void> {
  await adminFetch(`/api/store/new-arrivals/${id}`, { method: "DELETE" });
}

export async function reorderNewArrivals(ids: string[]): Promise<void> {
  await adminFetch("/api/store/new-arrivals/reorder", { method: "POST", body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Tienda › Últimos ingresos: qué productos y en qué orden (un producto nuevo
// entra primero solo).
// ---------------------------------------------------------------------------

export type LatestProduct = { id: string; product_id: string; sort_order: number };

export function getLatestProducts(): Promise<{ data: LatestProduct[] }> {
  return adminFetch("/api/store/latest");
}

export function addLatestProduct(productId: string): Promise<{ data: LatestProduct }> {
  return adminFetch("/api/store/latest", { method: "POST", body: JSON.stringify({ product_id: productId }) });
}

export async function removeLatestProduct(id: string): Promise<void> {
  await adminFetch(`/api/store/latest/${id}`, { method: "DELETE" });
}

export async function reorderLatestProducts(ids: string[]): Promise<void> {
  await adminFetch("/api/store/latest/reorder", { method: "POST", body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Tienda › Nosotros: el texto, las fotos de al lado y las publicaciones.
// ---------------------------------------------------------------------------

export type AboutPage = { title: string; body: string };
export type AboutPhoto = { id: string; sort_order: number; image_url: string };
export type SocialPost = { id: string; network: "instagram" | "tiktok"; url: string; sort_order: number };

export function getAbout(): Promise<{ data: { page: AboutPage; photos: AboutPhoto[]; posts: SocialPost[] } }> {
  return adminFetch("/api/store/about");
}

export function updateAbout(patch: Partial<AboutPage>): Promise<{ data: AboutPage }> {
  return adminFetch("/api/store/about", { method: "PATCH", body: JSON.stringify(patch) });
}

export function createAboutPhoto(image_url: string): Promise<{ data: AboutPhoto }> {
  return adminFetch("/api/store/about/photos", { method: "POST", body: JSON.stringify({ image_url }) });
}

export async function deleteAboutPhoto(id: string): Promise<void> {
  await adminFetch(`/api/store/about/photos/${id}`, { method: "DELETE" });
}

export async function reorderAboutPhotos(ids: string[]): Promise<void> {
  await adminFetch("/api/store/about/photos/reorder", { method: "POST", body: JSON.stringify({ ids }) });
}

export function createSocialPost(url: string): Promise<{ data: SocialPost }> {
  return adminFetch("/api/store/social", { method: "POST", body: JSON.stringify({ url }) });
}

export async function deleteSocialPost(id: string): Promise<void> {
  await adminFetch(`/api/store/social/${id}`, { method: "DELETE" });
}

export type InstagramStatus =
  | { connected: false }
  | {
      connected: true;
      username: string | null;
      expiresAt: string;
      /** Lo último que respondió Instagram cuando falló (null = anda bien). */
      lastError: string | null;
      lastErrorAt: string | null;
      /** Cuándo se guardaron los posts del respaldo. */
      cachedAt: string | null;
    };

export function getInstagramStatus(): Promise<{ data: InstagramStatus }> {
  return adminFetch("/api/store/instagram");
}

export function connectInstagram(token: string): Promise<{ data: InstagramStatus }> {
  return adminFetch("/api/store/instagram", { method: "PUT", body: JSON.stringify({ token }) });
}

export async function disconnectInstagram(): Promise<void> {
  await adminFetch("/api/store/instagram", { method: "DELETE" });
}

export async function reorderSocialPosts(ids: string[]): Promise<void> {
  await adminFetch("/api/store/social/reorder", { method: "POST", body: JSON.stringify({ ids }) });
}

export type HomeSectionKey = "categorias" | "mas_vendidas" | "ultimos" | "instagram";

export type HomeSection = { key: HomeSectionKey; sort_order: number; visible: boolean; title: string };

export function getHomeSections(): Promise<{ data: HomeSection[] }> {
  return adminFetch("/api/store/sections");
}

export function updateHomeSection(
  key: HomeSectionKey,
  patch: { title?: string; visible?: boolean },
): Promise<{ data: HomeSection }> {
  return adminFetch(`/api/store/sections/${key}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function reorderHomeSections(keys: HomeSectionKey[]): Promise<void> {
  await adminFetch("/api/store/sections/reorder", { method: "POST", body: JSON.stringify({ keys }) });
}
