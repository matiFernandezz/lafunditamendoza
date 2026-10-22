import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { removeStoreImage } from "@/lib/server/storeContent";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SLIDE_SELECT, parseSlideFields } from "../fields";

/** Cambia las fotos, el tipo o los textos de un slide. Si cambia una foto, se borra la anterior. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/store/slides/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const parsed = parseSlideFields(await readJsonBody(request), true);
  if ("error" in parsed) return jsonError(400, parsed.error);
  if (Object.keys(parsed.fields).length === 0) return jsonError(400, "No hay nada para cambiar");

  const supabase = supabaseAdmin();
  const { data: before } = await supabase
    .from("home_slides")
    .select("image_url, mobile_image_url")
    .eq("id", id)
    .maybeSingle();
  if (!before) return jsonError(404, "Esa foto del carrusel no existe.");

  const { data, error } = await supabase.from("home_slides").update(parsed.fields).eq("id", id).select(SLIDE_SELECT).single();
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo guardar");
  if (parsed.fields.image_url && parsed.fields.image_url !== before.image_url) await removeStoreImage(before.image_url);
  if (parsed.fields.mobile_image_url !== undefined && parsed.fields.mobile_image_url !== before.mobile_image_url) {
    await removeStoreImage(before.mobile_image_url);
  }
  return jsonData(data);
}

/** Quita un slide (y sus fotos, si se habían subido desde Tienda). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/store/slides/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { data, error } = await supabaseAdmin().from("home_slides").delete().eq("id", id).select("image_url, mobile_image_url").maybeSingle();
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Esa foto del carrusel no existe.");
  await removeStoreImage(data.image_url);
  await removeStoreImage(data.mobile_image_url);
  return jsonData({ id });
}
