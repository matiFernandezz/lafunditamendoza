import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ARRIVAL_SELECT, parseArrivalFields, withStock } from "./fields";

/** Fundas de "Las funditas más vendidas", en orden, con su precio y stock de hoy. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin()
    .from("home_new_arrivals")
    .select(ARRIVAL_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return jsonError(500, error.message);
  return jsonData((data ?? []).map(withStock));
}

/** Agrega una funda al final, con su foto recortada y el color del canto. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody(request);
  if (!isUuid(body.product_id)) return jsonError(400, "product_id debe ser un uuid valido");
  const parsed = parseArrivalFields(body, false);
  if ("error" in parsed) return jsonError(400, parsed.error);

  const supabase = supabaseAdmin();
  const { data: last } = await supabase
    .from("home_new_arrivals")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("home_new_arrivals")
    .insert({ ...parsed.fields, product_id: body.product_id, sort_order: (last?.sort_order ?? -1) + 1 })
    .select(ARRIVAL_SELECT)
    .single();
  if (error?.code === "23503") return jsonError(404, "Ese producto no existe.");
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo agregar la funda");
  return jsonData(withStock(data), 201);
}
