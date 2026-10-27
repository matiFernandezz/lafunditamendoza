import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Saca un producto de "Últimos ingresos" (el producto no se toca). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/store/latest/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { data, error } = await supabaseAdmin()
    .from("home_latest_products")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Ese producto no está en Últimos ingresos.");
  return jsonData({ id });
}
