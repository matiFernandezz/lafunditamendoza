import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ERRORS: Record<string, number> = { CM400: 400, CM404: 404, CM422: 422 };

/** Cambia la cuenta (efectivo o banco) de un pedido pagado, cuando la caja supuso mal. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/cash/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { account } = await readJsonBody(request);
  const { error } = await supabaseAdmin().rpc("set_cash_movement_account", {
    p_id: id,
    p_account: typeof account === "string" ? account : null,
  });
  if (error) return jsonError(ERRORS[error.code] ?? 500, error.message);
  return jsonData({ id, account });
}
