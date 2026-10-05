import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, isTrue } from "@/lib/server/colorManagement";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

// Celdas de la matriz modelo × color (o motivo) de un producto. Cada celda es
// una variante: `active: true` la crea o la reactiva; `active: false` la da de
// baja (nunca la borra; con stock y sin `force` responde blocked: true).
// `models` son ids de modelo; null es la variante sin modelo.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/products/[id]/cells">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { kind, attr_id, models, active, force, dry_run } = await readJsonBody(request);

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (kind !== "color" && kind !== "motif") return jsonError(400, "kind debe ser color o motif");
  if (!isUuid(attr_id)) return jsonError(400, "attr_id debe ser un uuid valido");
  if (!Array.isArray(models) || models.length === 0 || !models.every((m) => m === null || isUuid(m))) {
    return jsonError(400, "models debe ser un array no vacio de uuids (o null para la variante sin modelo)");
  }
  if (new Set(models).size !== models.length) return jsonError(400, "models no puede repetir modelos");
  if (typeof active !== "boolean") return jsonError(400, "active debe ser true o false");

  return colorRpc("apply_attribute_cells", {
    p_product_id: id,
    p_kind: kind,
    p_attr_id: attr_id,
    p_models: models,
    p_active: active,
    p_force: isTrue(force),
    p_dry_run: isTrue(dry_run),
  });
}
