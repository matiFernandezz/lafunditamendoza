import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { VARIANT_SELECT } from "@/lib/server/selects";
import { isPositiveNumber, isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Mismo precio para todas las variantes del producto (todos los modelos y
// colores), en un solo UPDATE: o cambian todas o ninguna.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/products/[id]/price">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { price } = await readJsonBody(request);

  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }

  if (!isPositiveNumber(price)) {
    return jsonError(400, "price debe ser un numero mayor a 0");
  }

  const supabase = supabaseAdmin();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (productError) return jsonError(500, productError.message);
  if (!product) return jsonError(404, "No existe un producto con ese id");

  const { data, error } = await supabase
    .from("product_variants")
    .update({ price })
    .eq("product_id", id)
    .select(VARIANT_SELECT);

  if (error) return jsonError(500, error.message);
  return jsonData(data);
}
