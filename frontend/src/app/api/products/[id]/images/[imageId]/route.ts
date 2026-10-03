import { NextResponse } from "next/server";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/productImages";
import { requireAdmin } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Extrae el path dentro del bucket a partir de la URL publica que guardamos. */
function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/products/[id]/images/[imageId]">,
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id, imageId } = await ctx.params;

  if (!isUuid(id) || !isUuid(imageId)) {
    return jsonError(400, "id e imageId deben ser uuids validos");
  }

  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", id)
    .select("url")
    .maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "No existe esa imagen para ese producto");

  const storagePath = storagePathFromUrl(data.url);
  if (storagePath) {
    // Si falla el borrado en Storage no hacemos fallar el request: la fila ya
    // se borro y es lo que importa para el catalogo; el archivo huerfano no
    // es visible para nadie.
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([storagePath]);
  }

  return new NextResponse(null, { status: 204 });
}
