import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { WEB_ORDER_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { webOrderRpcError } from "@/lib/server/webOrders";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/web-orders/[id]/paid">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }

  const supabase = supabaseAdmin();

  const { error } = await supabase.rpc("mark_web_order_paid", { p_order_id: id });
  if (error) return webOrderRpcError(error);

  const { data, error: readError } = await supabase
    .from("web_orders")
    .select(WEB_ORDER_SELECT)
    .eq("id", id)
    .single();

  if (readError) return jsonError(500, readError.message);
  return jsonData(data);
}
