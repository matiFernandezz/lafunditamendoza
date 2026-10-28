import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ERRORS: Record<string, number> = { CM400: 400, CM404: 404, CM409: 409, CM422: 422 };

/** Anula un movimiento manual (una transferencia, los dos lados). Queda registrado con el motivo. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/cash/[id]/void">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { reason } = await readJsonBody(request);
  const { error } = await supabaseAdmin().rpc("void_cash_movement", {
    p_id: id,
    p_reason: typeof reason === "string" ? reason : null,
  });
  if (error) return jsonError(ERRORS[error.code] ?? 500, error.message);
  return jsonData({ id });
}
