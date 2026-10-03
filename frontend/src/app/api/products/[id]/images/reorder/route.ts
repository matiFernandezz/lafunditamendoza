import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { PRODUCT_IMAGE_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/products/[id]/images/reorder">,
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { order } = await readJsonBody(request);

  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }

  if (!Array.isArray(order) || order.length === 0 || !order.every(isUuid)) {
    return jsonError(400, "order debe ser un array de uuids");
  }

  const supabase = supabaseAdmin();

  // Valida que order sea exactamente el set actual y reordena en un solo UPDATE.
  const { error: reorderError } = await supabase.rpc("reorder_product_images", {
    p_product_id: id,
    p_order: order,
  });

  if (reorderError) {
    return jsonError(reorderError.code === "PI400" ? 400 : 500, reorderError.message);
  }

  const { data, error } = await supabase
    .from("product_images")
    .select(PRODUCT_IMAGE_SELECT)
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  if (error) return jsonError(500, error.message);
  return jsonData(data);
}
