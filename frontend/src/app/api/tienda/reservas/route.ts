import { NextResponse, type NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/adminProxy";

// Pública (sin sesión de admin): es la compra desde la tienda. Solo se
// reenvían los campos esperados; el backend valida y fija los precios.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const { customer_name, customer_phone, items } = (body ?? {}) as Record<string, unknown>;
  const cleanItems = Array.isArray(items)
    ? items.map((item) => {
        const { variant_id, quantity } = (item ?? {}) as Record<string, unknown>;
        return { variant_id, quantity };
      })
    : items;

  return forwardToBackend("/api/web-orders", {
    method: "POST",
    body: JSON.stringify({ customer_name, customer_phone, items: cleanItems }),
  });
}
