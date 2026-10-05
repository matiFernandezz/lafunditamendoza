import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, isTrue, parseModelIds } from "@/lib/server/colorManagement";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

// Agrega un color a todos los productos de la categoría y de sus tipos (los
// que ya manejan colores), en los modelos elegidos: model_ids es una lista de
// modelos o, si no viene, todos. Accesorios y sus tipos se rechazan. Con
// dry_run devuelve qué pasaría, sin crear nada.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/categories/[id]/colors">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { color_id, dry_run, model_ids } = await readJsonBody(request);

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (!isUuid(color_id)) return jsonError(400, "color_id debe ser un uuid valido");

  const modelIds = parseModelIds(model_ids);
  if (modelIds === false) return jsonError(400, "model_ids debe ser una lista no vacia de uuids (o no enviarse)");

  return colorRpc("add_color_to_category_models", {
    p_category_id: id,
    p_color_id: color_id,
    p_model_ids: modelIds,
    p_dry_run: isTrue(dry_run),
  });
}
