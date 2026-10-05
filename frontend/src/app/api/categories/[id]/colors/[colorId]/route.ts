import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, parseModelIds, queryFlag } from "@/lib/server/colorManagement";
import { jsonError } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

// Quita un color de todos los productos de la categoría y de sus tipos: da de
// baja las variantes con stock 0 y devuelve en `omitted` las que tienen stock
// (en bloque no se fuerza). ?models=id,id limita a esos modelos (si no viene,
// todos). ?dry_run=1 solo informa.
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/categories/[id]/colors/[colorId]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id, colorId } = await ctx.params;

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (!isUuid(colorId)) return jsonError(400, "colorId debe ser un uuid valido");

  const modelIds = parseModelIds(request.nextUrl.searchParams.get("models"));
  if (modelIds === false) return jsonError(400, "models debe ser una lista de uuids separados por coma");

  return colorRpc("remove_color_from_category_models", {
    p_category_id: id,
    p_color_id: colorId,
    p_model_ids: modelIds,
    p_dry_run: queryFlag(request, "dry_run"),
  });
}
