// Llama a los Route Handlers de Next (/app/api/*), no al backend directo:
// son ellos los que verifican la sesión de Supabase Auth y agregan la
// x-api-key del backend del lado del servidor. Ver src/lib/adminProxy.ts.

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData (subida de archivos) no lleva Content-Type manual: el browser
  // pone el suyo con el boundary correcto.
  const isFormData = init?.body instanceof FormData;

  const res = await fetch(path, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
};

export type AdminProductImage = {
  id: string;
  url: string;
  sort_order: number;
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
  /** Lo que realmente se cobró: con el descuento ya aplicado. */
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

export type Sale = SaleRecord & { sale_items: SaleLine[] };

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

export type AdminCategory = {
  id: string;
  name: string;
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

export function updateVariantStock(
  id: string,
  stock_quantity: number,
): Promise<{ data: AdminVariant }> {
  return adminFetch(`/api/product-variants/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ stock_quantity }),
  });
}

export function updateVariantPrice(id: string, price: number): Promise<{ data: AdminVariant }> {
  return adminFetch(`/api/product-variants/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ price }),
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

export function updateProductName(id: string, name: string): Promise<{ data: AdminProduct }> {
  return adminFetch(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function addProductImage(
  productId: string,
  file: File,
): Promise<{ data: AdminProductImage }> {
  const formData = new FormData();
  formData.append("image", file);
  return adminFetch(`/api/products/${productId}/images`, {
    method: "POST",
    body: formData,
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
