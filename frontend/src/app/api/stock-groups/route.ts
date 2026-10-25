import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, queryFlag } from "@/lib/server/colorManagement";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

/** La regla general de stock compartido: los grupos de modelos guardados ([[13, 14], …]). */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return colorRpc("stock_rule_groups", {});
}

// Guarda la regla general ({ groups } con listas de ids de modelo; [] = ningún
// modelo comparte) y la aplica a todos los productos que no son excepción. De
// ahí en más se aplica sola a los productos y modelos que se carguen.
// ?dry_run=1 solo informa cuántos productos y variantes cambian.
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { groups } = await readJsonBody(request);
  if (!Array.isArray(groups) || !groups.every((g) => Array.isArray(g) && g.every(isUuid))) {
    return jsonError(400, "groups debe ser una lista de grupos de ids de modelo");
  }

  return colorRpc("set_all_stock_groups", { p_groups: groups, p_dry_run: queryFlag(request, "dry_run") });
}
