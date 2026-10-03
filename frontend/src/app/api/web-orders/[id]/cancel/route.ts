import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { WEB_ORDER_SELECT } from "@/lib/server/selects";
import { isOptionalText, isUuid } from "@/lib/server/validate";
import { webOrderRpcError } from "@/lib/server/webOrders";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_REASON_LENGTH = 120;

export async function POST(request: NextRequest, ctx: RouteContext<"/api/web-orders/[id]/cancel">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { reason } = await readJsonBody(request);

  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }
  if (!isOptionalText(reason, MAX_REASON_LENGTH)) {
    return jsonError(400, `reason tiene que ser un texto de hasta ${MAX_REASON_LENGTH} caracteres`);
  }

  const supabase = supabaseAdmin();

  const { error } = await supabase.rpc("cancel_web_order", { p_order_id: id, p_reason: reason ?? null });
  if (error) return webOrderRpcError(error);

  const { data, error: readError } = await supabase
    .from("web_orders")
    .select(WEB_ORDER_SELECT)
    .eq("id", id)
    .single();

  if (readError) return jsonError(500, readError.message);
  return jsonData(data);
}
