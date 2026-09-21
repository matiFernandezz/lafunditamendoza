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
};

export type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  category_id: string;
  created_at: string;
  product_variants: AdminVariant[];
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
};

export type CreatedSale = {
  id: string;
  sale_date: string;
  payment_method: string;
  channel: string | null;
  total_amount: number;
  notes: string | null;
};

export function createSale(payload: CreateSalePayload): Promise<{ data: CreatedSale }> {
  return adminFetch("/api/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
