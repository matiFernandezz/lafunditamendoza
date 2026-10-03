import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { VARIANT_SELECT } from "@/lib/server/selects";
import { isNonNegativeInt, isPositiveNumber, isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_COLOR_LENGTH = 60;
const MAX_SKU_LENGTH = 64;

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { product_id, iphone_model_id, color, sku, price, cost_price, stock_quantity } =
    await readJsonBody(request);

  if (!isUuid(product_id)) {
    return jsonError(400, "product_id debe ser un uuid valido");
  }

  if (iphone_model_id !== undefined && iphone_model_id !== null && !isUuid(iphone_model_id)) {
    return jsonError(400, "iphone_model_id debe ser un uuid valido (o null si no depende del modelo)");
  }

  if (
    color !== undefined &&
    color !== null &&
    (typeof color !== "string" || color.trim().length > MAX_COLOR_LENGTH)
  ) {
    return jsonError(400, `color debe ser texto de hasta ${MAX_COLOR_LENGTH} caracteres (o no enviarse)`);
  }

  if (typeof sku !== "string" || sku.trim() === "" || sku.trim().length > MAX_SKU_LENGTH) {
    return jsonError(400, `sku es obligatorio (texto de hasta ${MAX_SKU_LENGTH} caracteres)`);
  }

  if (!isPositiveNumber(price)) {
    return jsonError(400, "price debe ser un numero mayor a 0");
  }

  if (
    cost_price !== undefined &&
    (typeof cost_price !== "number" || !Number.isFinite(cost_price) || cost_price < 0)
  ) {
    return jsonError(400, "cost_price debe ser un numero mayor o igual a 0");
  }

  if (stock_quantity !== undefined && !isNonNegativeInt(stock_quantity)) {
    return jsonError(400, "stock_quantity debe ser un entero mayor o igual a 0");
  }

  const trimmedColor = typeof color === "string" ? color.trim() : "";
  const trimmedSku = sku.trim();

  const { data, error } = await supabaseAdmin()
    .from("product_variants")
    .insert({
      product_id,
      iphone_model_id: iphone_model_id ?? null,
      color: trimmedColor === "" ? null : trimmedColor,
      sku: trimmedSku,
      price,
      cost_price: cost_price ?? 0,
      stock_quantity: stock_quantity ?? 0,
    })
    .select(VARIANT_SELECT)
    .single();

  if (error?.code === "23505") {
    return jsonError(409, `Ya existe una variante con el SKU "${trimmedSku}"`);
  }

  if (error?.code === "23503") {
    return jsonError(400, "El producto o el modelo de iPhone indicado no existe");
  }

  if (error || !data) return jsonError(500, error?.message ?? "No se pudo crear la variante");
  return jsonData(data, 201);
}
