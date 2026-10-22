import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SECTION_SELECT, isSectionKey } from "../keys";

const MAX_TITLE = 60;

/** Cambia el título de una sección o si se ve en la home. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/store/sections/[key]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { key } = await ctx.params;
  if (!isSectionKey(key)) return jsonError(404, "Esa sección no existe.");

  const { title, visible } = await readJsonBody(request);
  const fields: Record<string, unknown> = {};
  if (title !== undefined) {
    if (typeof title !== "string" || title.trim() === "" || title.trim().length > MAX_TITLE) {
      return jsonError(400, `El título es obligatorio (hasta ${MAX_TITLE} caracteres)`);
    }
    fields.title = title.trim();
  }
  if (visible !== undefined) {
    if (typeof visible !== "boolean") return jsonError(400, "visible debe ser true o false");
    fields.visible = visible;
  }
  if (Object.keys(fields).length === 0) return jsonError(400, "No hay nada para cambiar");

  const { data, error } = await supabaseAdmin()
    .from("home_sections")
    .update(fields)
    .eq("key", key)
    .select(SECTION_SELECT)
    .maybeSingle();
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Esa sección no existe.");
  return jsonData(data);
}
