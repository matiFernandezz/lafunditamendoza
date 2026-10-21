import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { SUPPLIER_SELECT } from "@/lib/server/selects";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseSupplierFields } from "./supplierFields";

type PurchaseStat = { total_amount: number; shipping_cost: number; status: string; purchase_date: string };

/** Proveedores con lo que se les compró: pedidos, total pagado y último pedido. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin()
    .from("suppliers")
    .select(`${SUPPLIER_SELECT}, purchases ( total_amount, shipping_cost, status, purchase_date )`)
    .order("name", { ascending: true });

  if (error) return jsonError(500, error.message);
  return jsonData(
    (data ?? []).map(({ purchases, ...supplier }) => {
      const list = (purchases ?? []) as PurchaseStat[];
      const paid = list.filter((p) => p.status !== "armando");
      return {
        ...supplier,
        purchases_count: list.length,
        total_paid: paid.reduce((sum, p) => sum + Number(p.total_amount) + Number(p.shipping_cost), 0),
        last_purchase_date: list.reduce<string | null>(
          (last, p) => (last === null || p.purchase_date > last ? p.purchase_date : last),
          null,
        ),
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = parseSupplierFields(await readJsonBody(request), false);
  if ("error" in parsed) return jsonError(400, parsed.error);

  const { data, error } = await supabaseAdmin().from("suppliers").insert(parsed.fields).select(SUPPLIER_SELECT).single();

  if (error || !data) return jsonError(500, error?.message ?? "No se pudo crear el proveedor");
  return jsonData(data, 201);
}
