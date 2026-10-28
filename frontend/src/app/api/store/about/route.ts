import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Página Nosotros: el texto, las fotos del carrusel y las publicaciones, en orden. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = supabaseAdmin();
  const [page, photos, posts] = await Promise.all([
    supabase.from("about_page").select("title, body, show_tiktok").eq("id", 1).single(),
    supabase.from("about_photos").select("id, sort_order, image_url").order("sort_order").order("created_at"),
    supabase.from("social_posts").select("id, network, url, sort_order").order("sort_order").order("created_at"),
  ]);
  const error = page.error ?? photos.error ?? posts.error;
  if (error) return jsonError(500, error.message);
  return jsonData({ page: page.data, photos: photos.data, posts: posts.data });
}

/** Cambia el título o el texto de Nosotros. */
export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { title, body, show_tiktok } = await readJsonBody(request);
  const fields: Record<string, string | boolean> = {};
  if (title !== undefined) {
    if (typeof title !== "string" || title.trim() === "" || title.trim().length > 60) {
      return jsonError(400, "El título no puede quedar vacío y va hasta 60 caracteres.");
    }
    fields.title = title.trim();
  }
  if (body !== undefined) {
    if (typeof body !== "string" || body.trim() === "" || body.trim().length > 2000) {
      return jsonError(400, "El texto no puede quedar vacío y va hasta 2000 caracteres.");
    }
    fields.body = body.trim();
  }
  if (show_tiktok !== undefined) {
    if (typeof show_tiktok !== "boolean") return jsonError(400, "show_tiktok debe ser true o false");
    fields.show_tiktok = show_tiktok;
  }
  if (Object.keys(fields).length === 0) return jsonError(400, "No hay nada para cambiar");

  const { data, error } = await supabaseAdmin().from("about_page").update(fields).eq("id", 1).select("title, body, show_tiktok").single();
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo guardar");
  return jsonData(data);
}
