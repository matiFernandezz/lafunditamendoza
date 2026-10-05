import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc, isTrue } from "@/lib/server/colorManagement";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

// "Pasar a motivo": mueve las variantes y fotos de este color a un motivo con
// el mismo nombre (lo crea si no existe). El color queda en la lista, sin uso.
// Con dry_run devuelve cuántas variantes, productos y fotos se moverían.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/colors/[id]/to-motif">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { dry_run } = await readJsonBody(request);

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  return colorRpc("color_to_motif", { p_color_id: id, p_dry_run: isTrue(dry_run) });
}
