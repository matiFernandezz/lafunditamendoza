import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, isTrue } from "@/lib/server/colorManagement";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

// Agrega un color al producto: una variante por modelo, con stock 0. Con
// dry_run devuelve el mismo resumen sin crear nada.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/products/[id]/colors">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { color_id, dry_run } = await readJsonBody(request);

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (!isUuid(color_id)) return jsonError(400, "color_id debe ser un uuid valido");

  return colorRpc("add_color_to_product", { p_product_id: id, p_color_id: color_id, p_dry_run: isTrue(dry_run) });
}
