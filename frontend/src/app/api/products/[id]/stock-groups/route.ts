import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, queryFlag } from "@/lib/server/colorManagement";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

// Grupos de modelos que comparten stock en este producto, puestos a mano: el
// producto queda como excepción a la regla general. { groups } con listas de
// ids de modelo ([] = ninguno comparte); { groups: null } lo vuelve a la regla.
// Al armar un grupo, cada color o diseño queda con el stock más alto de sus
// variantes. ?dry_run=1 solo informa qué variantes cambian.
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/products/[id]/stock-groups">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { groups } = await readJsonBody(request);
  if (groups !== null && (!Array.isArray(groups) || !groups.every((g) => Array.isArray(g) && g.every(isUuid)))) {
    return jsonError(400, "groups debe ser una lista de grupos de ids de modelo (o null para volver a la regla)");
  }

  return colorRpc("set_custom_stock_groups", {
    p_product_id: id,
    p_groups: groups,
    p_dry_run: queryFlag(request, "dry_run"),
  });
}
