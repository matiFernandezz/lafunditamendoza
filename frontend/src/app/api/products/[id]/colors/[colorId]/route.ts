import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, queryFlag } from "@/lib/server/colorManagement";
import { jsonError } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

// Quita un color del producto: da de baja sus variantes (no las borra). Si
// alguna tiene stock y no viene ?force=1, no hace nada y responde
// blocked: true con el detalle. ?dry_run=1 solo informa.
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/products/[id]/colors/[colorId]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id, colorId } = await ctx.params;

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (!isUuid(colorId)) return jsonError(400, "colorId debe ser un uuid valido");

  return colorRpc("remove_color_from_product", {
    p_product_id: id,
    p_color_id: colorId,
    p_force: queryFlag(request, "force"),
    p_dry_run: queryFlag(request, "dry_run"),
  });
}
