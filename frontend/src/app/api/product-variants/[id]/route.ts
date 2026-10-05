import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, queryFlag } from "@/lib/server/colorManagement";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { VARIANT_SELECT } from "@/lib/server/selects";
import { isNonNegativeInt, isPositiveNumber, isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/product-variants/[id]">,
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { stock_quantity, price } = await readJsonBody(request);

  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }

  if (stock_quantity === undefined && price === undefined) {
    return jsonError(400, "Envia stock_quantity, price o ambos");
  }

  if (stock_quantity !== undefined && !isNonNegativeInt(stock_quantity)) {
    return jsonError(400, "stock_quantity debe ser un entero mayor o igual a 0");
  }

  if (price !== undefined && !isPositiveNumber(price)) {
    return jsonError(400, "price debe ser un numero mayor a 0");
  }

  const { data, error } = await supabaseAdmin()
    .from("product_variants")
    .update({
      ...(stock_quantity !== undefined ? { stock_quantity } : {}),
      ...(price !== undefined ? { price } : {}),
    })
    .eq("id", id)
    .select(VARIANT_SELECT)
    .maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "No existe una variante con ese id");
  return jsonData(data);
}

// "Eliminar": si la variante no tiene ventas, compras ni reservas, se borra. Si
// tiene, queda archivada (oculta en todo el panel y la tienda; solo vive en el
// historial). Con stock y sin ?force=1 responde blocked: true con las unidades,
// para pedir confirmación. ?dry_run=1 solo informa.
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/product-variants/[id]">,
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  return colorRpc("delete_variant", {
    p_variant_id: id,
    p_force: queryFlag(request, "force"),
    p_dry_run: queryFlag(request, "dry_run"),
  });
}
