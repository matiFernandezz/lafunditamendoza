import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, isTrue } from "@/lib/server/colorManagement";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { isNonNegativeInt, isPositiveNumber, isUuid } from "@/lib/server/validate";

const MAX_TEXT_LENGTH = 60;
const MAX_SKU_LENGTH = 64;

// "Agregar variante": crea una variante por modelo elegido, en una transacción.
//   kind: "color" | "motif" (con attr_id) | "text" (con text, que puede ir vacío)
//   models: ids de modelo; null es la variante universal
//   stock, price (si no viene se copia de otra variante), sku (opcional, solo
//   con un modelo; si no viene se arma solo)
// Si la combinación ya existe activa no duplica (la devuelve en `already`); si
// estaba archivada, la reactiva. Con dry_run devuelve qué pasaría.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/products/[id]/variants">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { kind, attr_id, text, models, stock, price, sku, dry_run } = await readJsonBody(request);

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (kind !== "color" && kind !== "motif" && kind !== "text") {
    return jsonError(400, "kind debe ser color, motif o text");
  }
  if (kind !== "text" && !isUuid(attr_id)) return jsonError(400, "attr_id debe ser un uuid valido");
  if (text !== undefined && text !== null && (typeof text !== "string" || text.trim().length > MAX_TEXT_LENGTH)) {
    return jsonError(400, `text debe ser texto de hasta ${MAX_TEXT_LENGTH} caracteres`);
  }
  if (!Array.isArray(models) || models.length === 0 || !models.every((m) => m === null || isUuid(m))) {
    return jsonError(400, "models debe ser un array no vacio de uuids (o null para la variante universal)");
  }
  if (new Set(models).size !== models.length) return jsonError(400, "models no puede repetir modelos");
  if (stock !== undefined && !isNonNegativeInt(stock)) {
    return jsonError(400, "stock debe ser un entero mayor o igual a 0");
  }
  if (price !== undefined && price !== null && !isPositiveNumber(price)) {
    return jsonError(400, "price debe ser un numero mayor a 0 (o no enviarse)");
  }
  if (sku !== undefined && sku !== null && (typeof sku !== "string" || sku.trim().length > MAX_SKU_LENGTH)) {
    return jsonError(400, `sku debe ser texto de hasta ${MAX_SKU_LENGTH} caracteres`);
  }

  return colorRpc("add_product_variants", {
    p_product_id: id,
    p_kind: kind,
    p_attr_id: kind === "text" ? null : attr_id,
    p_text: kind === "text" ? (text ?? null) : null,
    p_models: models,
    p_stock: stock ?? 0,
    p_price: price ?? null,
    p_sku: typeof sku === "string" && sku.trim() !== "" ? sku.trim() : null,
    p_dry_run: isTrue(dry_run),
  });
}
