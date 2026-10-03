import "server-only";
import { WEB_ORDER_PUBLIC_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Lectura de una reserva web para la tienda, del lado del servidor: web_orders
// no es legible con la anon key, así que se lee con la secret key y solo se
// devuelve lo que puede ver el cliente (sin teléfono ni ids internos).

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
  if (!isUuid(token)) return null;

  const { data, error } = await supabaseAdmin()
    .from("web_orders")
    .select(WEB_ORDER_PUBLIC_SELECT)
    .eq("public_token", token)
    .maybeSingle()
    .overrideTypes<PublicReservation | null, { merge: false }>();

  if (error) throw new Error(`No se pudo leer la reserva: ${error.message}`);
  if (!data) return null;

  return {
    ...data,
    total_amount: Number(data.total_amount),
    items: data.items.map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
  };
}
