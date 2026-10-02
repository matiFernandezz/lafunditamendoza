// Solo se importa desde componentes de servidor (usa BACKEND_API_KEY).
import { requireEnv } from "@/lib/requireEnv";

// Lectura de una reserva web para la tienda, del lado del servidor (la API key
// del backend nunca llega al navegador).

export type ReservationItem = {
  id: string;
  quantity: number;
  unit_price: number;
  variant: {
    sku: string;
    color: string | null;
    product: { name: string } | null;
    iphone_model: { name: string } | null;
  } | null;
};

export type PublicReservation = {
  code: string;
  customer_name: string;
  status: "pendiente" | "pagada" | "cancelada";
  total_amount: number;
  created_at: string;
  expires_at: string;
  items: ReservationItem[];
};

export async function getPublicReservation(token: string): Promise<PublicReservation | null> {
  const backendUrl = requireEnv(process.env.BACKEND_URL, "BACKEND_URL");
  const apiKey = requireEnv(process.env.BACKEND_API_KEY, "BACKEND_API_KEY");

  const res = await fetch(`${backendUrl}/api/web-orders/public/${encodeURIComponent(token)}`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`No se pudo leer la reserva (HTTP ${res.status})`);

  const json = (await res.json()) as { data: PublicReservation };
  return {
    ...json.data,
    total_amount: Number(json.data.total_amount),
    items: json.data.items.map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
  };
}
