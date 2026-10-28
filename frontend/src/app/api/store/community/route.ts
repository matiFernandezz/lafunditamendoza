import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FIELDS = [
  { key: "title", label: "El título", max: 60, required: true },
  { key: "subtitle", label: "El subtítulo", max: 120, required: false },
  { key: "cta_label", label: "El texto del botón", max: 40, required: true },
] as const;

/** Comunidad: los textos y las fotos del carrusel, en orden. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = supabaseAdmin();
  const [content, photos] = await Promise.all([
    supabase.from("community_content").select("title, subtitle, cta_label").eq("id", 1).single(),
    supabase.from("community_photos").select("id, sort_order, image_url").order("sort_order").order("created_at"),
  ]);
  const error = content.error ?? photos.error;
  if (error) return jsonError(500, error.message);
  return jsonData({ content: content.data, photos: photos.data });
}

/** Cambia los textos de la sección. */
export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody(request);
  const fields: Record<string, string> = {};
  for (const { key, label, max, required } of FIELDS) {
    const value = body[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || (required && value.trim() === "") || value.trim().length > max) {
      return jsonError(400, `${label} ${required ? "no puede quedar vacío y " : ""}va hasta ${max} caracteres.`);
    }
    fields[key] = value.trim();
  }
  if (Object.keys(fields).length === 0) return jsonError(400, "No hay nada para cambiar");

  const { data, error } = await supabaseAdmin()
    .from("community_content")
    .update(fields)
    .eq("id", 1)
    .select("title, subtitle, cta_label")
    .single();
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo guardar");
  return jsonData(data);
}
