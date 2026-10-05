import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { colorRpc } from "@/lib/server/colorManagement";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";

// "Unir colores": pasa las variantes y fotos de este color a `into` y lo borra
// (ej. Celeste pastel -> Celeste).
export async function POST(request: NextRequest, ctx: RouteContext<"/api/colors/[id]/merge">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { into } = await readJsonBody(request);

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (!isUuid(into)) return jsonError(400, "into debe ser un uuid valido");

  return colorRpc("merge_attributes", { p_kind: "color", p_from: id, p_into: into });
}
