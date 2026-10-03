import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { SALE_SELECT } from "@/lib/server/selects";
import { isOptionalText, isPositiveInt, isPositiveNumber, isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseRange } from "./range";

const PAYMENT_METHODS = ["efectivo", "transferencia"];
const CHANNELS = ["feria", "whatsapp", "web"];
const MAX_DISCOUNT_PERCENT = 100;
const MAX_NOTES_LENGTH = 1000;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

type SaleItemInput = { variant_id: string; quantity: number; unit_price: number };

function validateItems(items: unknown): items is SaleItemInput[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const { variant_id, quantity, unit_price } = item as Record<string, unknown>;
    return isUuid(variant_id) && isPositiveInt(quantity) && isPositiveNumber(unit_price);
  });
}

/** Traduce los errores de la función SQL create_sale al HTTP que espera el panel. */
function saleError(error: { code: string; message: string; details?: string | null }) {
  switch (error.code) {
    case "CS404":
      return jsonError(400, "Alguna de las variantes de la venta no existe.");
    case "CS409": {
      // El precio cambió desde que se armó la venta: el detalle trae sku y precio actual.
      let detail: { sku?: string; price?: number } = {};
      try {
        detail = JSON.parse(error.details ?? "{}");
      } catch {
        // Sin detalle legible: se avisa igual, sin el precio.
      }
      const now = typeof detail.price === "number" ? `: ahora es ${formatPrice(detail.price)}` : "";
      return jsonError(
        409,
        `El precio de ${detail.sku ?? "un producto"} cambió${now}. Revisá el total y volvé a confirmar.`,
      );
    }
    case "CS400":
    case "CS410": // no alcanza el stock
    case "P0001": // trigger de stock
      return jsonError(400, error.message);
    default:
      return jsonError(500, error.message);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { payment_method, channel, notes, items, discount_percent } = await readJsonBody(request);

  if (typeof payment_method !== "string" || !PAYMENT_METHODS.includes(payment_method)) {
    return jsonError(400, `payment_method debe ser uno de: ${PAYMENT_METHODS.join(", ")}`);
  }

  if (
    channel !== undefined &&
    channel !== null &&
    (typeof channel !== "string" || !CHANNELS.includes(channel))
  ) {
    return jsonError(400, `channel debe ser uno de: ${CHANNELS.join(", ")} (o no enviarse)`);
  }

  if (!isOptionalText(notes, MAX_NOTES_LENGTH)) {
    return jsonError(400, `notes debe ser texto de hasta ${MAX_NOTES_LENGTH} caracteres (o no enviarse)`);
  }

  if (!validateItems(items)) {
    return jsonError(
      400,
      "items debe ser un array no vacio de { variant_id (uuid), quantity (entero > 0), unit_price (numero > 0) }",
    );
  }

  const discountPercent = discount_percent ?? 0;
  if (
    typeof discountPercent !== "number" ||
    !Number.isInteger(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > MAX_DISCOUNT_PERCENT
  ) {
    return jsonError(
      400,
      `discount_percent debe ser un entero entre 0 y ${MAX_DISCOUNT_PERCENT} (o no enviarse)`,
    );
  }

  // Venta + items + stock en una sola transacción (función SQL create_sale).
  // Subtotal, descuento y total se calculan ahí con los precios guardados;
  // unit_price viaja solo para avisar si el precio cambió mientras se armaba.
  const { data, error } = await supabaseAdmin().rpc("create_sale", {
    p_payment_method: payment_method,
    p_channel: channel ?? null,
    p_notes: notes ?? null,
    p_discount_percent: discountPercent,
    p_items: items.map(({ variant_id, quantity, unit_price }) => ({ variant_id, quantity, unit_price })),
  });

  if (error) return saleError(error);
  return jsonData(data, 201);
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = request.nextUrl;

  const range = parseRange(searchParams);
  if ("error" in range) return jsonError(400, range.error);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("page_size")) || 20));
  const offset = (page - 1) * pageSize;

  let query = supabaseAdmin()
    .from("sales")
    .select(SALE_SELECT, { count: "exact" })
    .order("sale_date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (range.from) query = query.gte("sale_date", range.from);
  if (range.to) query = query.lt("sale_date", range.to);

  const { data, error, count } = await query;

  if (error) return jsonError(500, error.message);

  return NextResponse.json({
    data,
    pagination: {
      page,
      page_size: pageSize,
      total: count ?? 0,
      total_pages: count !== null ? Math.ceil((count ?? 0) / pageSize) : 0,
    },
  });
}
