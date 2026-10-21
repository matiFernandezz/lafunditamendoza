import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const KINDS = ["color", "motif", "none"];

/**
 * Cómo son las variantes de la categoría: variant_kind (color, motif o none)
 * y by_model (por modelo de iPhone o universal). null = hereda de la de arriba.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { variant_kind, by_model } = await readJsonBody(request);
  const fields: Record<string, unknown> = {};

  if (variant_kind !== undefined) {
    if (variant_kind !== null && (typeof variant_kind !== "string" || !KINDS.includes(variant_kind))) {
      return jsonError(400, "variant_kind debe ser color, motif, none o null (hereda)");
    }
    fields.variant_kind = variant_kind;
  }
  if (by_model !== undefined) {
    if (by_model !== null && typeof by_model !== "boolean") {
      return jsonError(400, "by_model debe ser true, false o null (hereda)");
    }
    fields.by_model = by_model;
  }
  if (Object.keys(fields).length === 0) return jsonError(400, "No hay nada para cambiar");

  const { data, error } = await supabaseAdmin()
    .from("categories")
    .update(fields)
    .eq("id", id)
    .select("id, name, slug, parent_id, sort_order, variant_kind, by_model")
    .maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Esa categoría no existe.");
  return jsonData(data);
}
