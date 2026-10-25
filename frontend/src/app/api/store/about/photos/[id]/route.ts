import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { removeStoreImage } from "@/lib/server/storeContent";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Quita una foto del carrusel de Nosotros (y la borra, si se había subido desde Tienda). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/store/about/photos/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { data, error } = await supabaseAdmin().from("about_photos").delete().eq("id", id).select("image_url").maybeSingle();
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Esa foto no existe.");
  await removeStoreImage(data.image_url);
  return jsonData({ id });
}
