import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { WEB_ORDER_SELECT } from "@/lib/server/selects";
import { WEB_ORDER_STATUSES, type WebOrderStatus } from "@/lib/server/webOrders";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const status = (request.nextUrl.searchParams.get("status") ?? "pendiente") as WebOrderStatus;
  if (!WEB_ORDER_STATUSES.includes(status)) {
    return jsonError(400, `status debe ser uno de: ${WEB_ORDER_STATUSES.join(", ")}`);
  }

  // Pendientes: primero las que vencen antes. El resto: lo más nuevo arriba.
  const { data, error } = await supabaseAdmin()
    .from("web_orders")
    .select(WEB_ORDER_SELECT)
    .eq("status", status)
    .order("created_at", { ascending: status === "pendiente" })
    .limit(200);

  if (error) return jsonError(500, error.message);
  return jsonData(data);
}
