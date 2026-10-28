import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Saldo actual de cada cuenta (para el Inicio): cash_summary con un período vacío. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin().rpc("cash_summary", { p_from: now, p_to: now });
  if (error) return jsonError(500, error.message);
  return jsonData((data as { balance: unknown }).balance);
}
