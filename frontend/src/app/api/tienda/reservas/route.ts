import type { NextRequest } from "next/server";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { WEB_ORDER_SELECT } from "@/lib/server/selects";
import { isPositiveInt, isUuid } from "@/lib/server/validate";
import { webOrderRpcError } from "@/lib/server/webOrders";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Topes para que un carrito no reserve medio depósito.
const MAX_LINES = 20;
const MAX_QUANTITY = 10;
const MAX_NAME_LENGTH = 80;

type ItemInput = { variant_id: string; quantity: number };

function validateItems(items: unknown): items is ItemInput[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) return false;
  return items.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const { variant_id, quantity } = item as Record<string, unknown>;
    return isUuid(variant_id) && isPositiveInt(quantity) && quantity <= MAX_QUANTITY;
  });
}

// Pública (sin sesión de admin): es la compra desde la tienda. Solo se usan
// los campos esperados; los precios y el stock los fija la función SQL
// create_web_order, nunca el navegador.
export async function POST(request: NextRequest) {
  const { customer_name, customer_phone, items } = await readJsonBody(request);

  const name = typeof customer_name === "string" ? customer_name.trim() : "";
  const phone = typeof customer_phone === "string" ? customer_phone.trim() : "";
  const digits = phone.replace(/\D/g, "");

  if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
    return jsonError(400, "Escribí tu nombre.");
  }
  if (digits.length < 8 || digits.length > 15) {
    return jsonError(400, "Revisá tu WhatsApp: tiene que tener entre 8 y 15 números.");
  }
  if (!validateItems(items)) {
    return jsonError(
      400,
      `El carrito tiene que tener entre 1 y ${MAX_LINES} productos, con hasta ${MAX_QUANTITY} unidades cada uno.`,
    );
  }

  const supabase = supabaseAdmin();

  const { data: order, error } = await supabase.rpc("create_web_order", {
    p_customer_name: name,
    p_customer_phone: phone,
    p_items: items.map(({ variant_id, quantity }) => ({ variant_id, quantity })),
  });

  if (error) return webOrderRpcError(error);

  const { data, error: readError } = await supabase
    .from("web_orders")
    .select(WEB_ORDER_SELECT)
    .eq("id", order.id)
    .single();

  if (readError) return jsonError(500, readError.message);
  return jsonData(data, 201);
}
