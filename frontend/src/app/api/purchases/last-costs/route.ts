import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

type LastCostRow = { variant_id: string; product_id: string; unit_cost: number; purchase_date: string };

/**
 * Costo unitario de la última compra de cada variante, de la compra más nueva
 * a la más vieja: la primera fila de un producto es su último costo.
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin().rpc("last_purchase_costs");

  if (error) return jsonError(500, error.message);
  return jsonData(
    ((data ?? []) as LastCostRow[]).map((row) => ({
      variant_id: row.variant_id,
      product_id: row.product_id,
      unit_cost: Number(row.unit_cost),
      purchase_date: row.purchase_date,
    })),
  );
}
