import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LATEST_LIMIT } from "@/lib/latestProducts";

const LATEST_SELECT = "id, product_id, sort_order";

/** "Últimos ingresos" de la home, en orden (el panel arma nombre, foto y stock con sus productos). */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin()
    .from("home_latest_products")
    .select(LATEST_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return jsonError(500, error.message);
  return jsonData(data ?? []);
}

/** Agrega un producto primero en la lista (como entra uno nuevo). Con la lista llena, hay que sacar uno antes. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody(request);
  if (!isUuid(body.product_id)) return jsonError(400, "product_id debe ser un uuid valido");

  const supabase = supabaseAdmin();
  const { data: rows, error: listError } = await supabase
    .from("home_latest_products")
    .select("id, product_id, sort_order")
    .order("sort_order", { ascending: true });
  if (listError) return jsonError(500, listError.message);
  if ((rows ?? []).some((r) => r.product_id === body.product_id)) {
    return jsonError(409, "Ese producto ya está en Últimos ingresos.");
  }
  if ((rows ?? []).length >= LATEST_LIMIT) {
    return jsonError(409, `La lista ya tiene ${LATEST_LIMIT} productos: sacá uno antes de agregar otro.`);
  }

  // Corre los demás un lugar para que el nuevo quede primero.
  const shifted = await Promise.all(
    (rows ?? []).map((r, index) =>
      supabase
        .from("home_latest_products")
        .update({ sort_order: index + 1 })
        .eq("id", r.id),
    ),
  );
  const failed = shifted.find((r) => r.error);
  if (failed?.error) return jsonError(500, failed.error.message);

  const { data, error } = await supabase
    .from("home_latest_products")
    .insert({ product_id: body.product_id, sort_order: 0 })
    .select(LATEST_SELECT)
    .single();
  if (error?.code === "23503") return jsonError(404, "Ese producto no existe.");
  if (error?.code === "23505") return jsonError(409, "Ese producto ya está en Últimos ingresos.");
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo agregar el producto");
  return jsonData(data, 201);
}
