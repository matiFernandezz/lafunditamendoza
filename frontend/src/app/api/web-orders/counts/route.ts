import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { WEB_ORDER_STATUSES } from "@/lib/server/webOrders";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Cantidad por estado: el panel la usa para el contador rojo de la solapa.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = supabaseAdmin();
  const results = await Promise.all(
    WEB_ORDER_STATUSES.map((status) =>
      supabase.from("web_orders").select("id", { count: "exact", head: true }).eq("status", status),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return jsonError(500, failed.error.message);

  return jsonData(Object.fromEntries(WEB_ORDER_STATUSES.map((s, i) => [s, results[i].count ?? 0])));
}
