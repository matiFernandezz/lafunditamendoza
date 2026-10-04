import type { NextRequest } from "next/server";
import {
  MAX_PRODUCT_IMAGE_SIZE,
  MAX_PRODUCT_IMAGE_SIZE_MB,
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_IMAGE_TYPES,
} from "@/lib/productImages";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { PRODUCT_IMAGE_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Los paths los genera upload-url: <uuid>.<ext>, sin carpetas.
const PATH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

// Paso 2 de la subida: el navegador ya subió el archivo a Storage con la URL
// firmada; acá se comprueba que esté y se registra la fila en product_images.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/products/[id]/images">,
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { path, color_id } = await readJsonBody(request);

  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }

  if (typeof path !== "string" || !PATH_REGEX.test(path)) {
    return jsonError(400, "path debe ser el que devolvió upload-url");
  }

  // color_id: de qué color es la foto. Sin color (o null) es una foto general.
  if (color_id !== undefined && color_id !== null && !isUuid(color_id)) {
    return jsonError(400, "color_id debe ser un uuid valido (o null para una foto general)");
  }

  const supabase = supabaseAdmin();
  const bucket = supabase.storage.from(PRODUCT_IMAGE_BUCKET);

  const { data: file, error: fileError } = await bucket.info(path);
  if (fileError || !file) {
    return jsonError(400, "No encontramos la imagen subida. Probá de nuevo.");
  }

  // El bucket ya limita tipo y tamaño; se revisa igual por si su configuración cambia.
  if (file.contentType && !PRODUCT_IMAGE_TYPES.includes(file.contentType)) {
    await bucket.remove([path]);
    return jsonError(400, "La imagen tiene que ser JPEG, PNG o WEBP");
  }
  if (file.size !== undefined && file.size > MAX_PRODUCT_IMAGE_SIZE) {
    await bucket.remove([path]);
    return jsonError(400, `La imagen no puede superar ${MAX_PRODUCT_IMAGE_SIZE_MB}MB`);
  }

  const url = bucket.getPublicUrl(path).data.publicUrl;

  const { data: duplicate, error: duplicateError } = await supabase
    .from("product_images")
    .select("id")
    .eq("url", url)
    .limit(1)
    .maybeSingle();

  if (duplicateError) return jsonError(500, duplicateError.message);
  if (duplicate) return jsonError(409, "Esa imagen ya está cargada");

  const { data: existing, error: existingError } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return jsonError(500, existingError.message);

  const nextSortOrder = existing ? existing.sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: id, url, sort_order: nextSortOrder, color_id: color_id ?? null })
    .select(PRODUCT_IMAGE_SELECT)
    .single();

  if (error || !data) {
    // Sin fila, el archivo quedaría huérfano en Storage.
    await bucket.remove([path]);
    if (error?.code === "23503") return jsonError(404, "No existe un producto (o un color) con ese id");
    return jsonError(500, error?.message ?? "No se pudo guardar la imagen");
  }

  return jsonData(data, 201);
}
