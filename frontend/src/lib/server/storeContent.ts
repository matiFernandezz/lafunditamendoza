import "server-only";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/productImages";
import { jsonError } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Fotos de la tienda (carrusel, mosaicos, nuevos ingresos): van al mismo
// bucket público que las de producto, bajo esta carpeta.
export const STORE_FOLDER = "tienda";

const MAX_URL_LENGTH = 1000;

/**
 * Una foto válida para la tienda: una ruta del propio sitio ("/photos/x.jpg")
 * o una URL pública del bucket de fotos.
 */
export function isStoreImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return false;
  if (/^\/[A-Za-z0-9._\-/]+$/.test(value) && !value.includes("..")) return true;
  return value.includes(`/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`);
}

/** Borra del bucket una foto subida desde Tienda (las del sitio o de productos no se tocan). */
export async function removeStoreImage(url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${STORE_FOLDER}/`;
  if (!url || !url.includes(marker)) return;
  const path = `${STORE_FOLDER}/${url.split(marker)[1]}`;
  await supabaseAdmin().storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
}

/** Guarda el orden de una lista: ids en el orden nuevo (todos los de la tabla). */
export async function reorderRows(
  table: "home_slides" | "home_new_arrivals" | "home_latest_products" | "about_photos" | "community_photos" | "social_posts",
  ids: unknown,
) {
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isUuid) || new Set(ids).size !== ids.length) {
    return jsonError(400, "ids debe ser la lista de ids en el orden nuevo, sin repetir");
  }
  const supabase = supabaseAdmin();
  const { data: rows, error } = await supabase.from(table).select("id");
  if (error) return jsonError(500, error.message);
  const current = new Set((rows ?? []).map((r) => r.id as string));
  if (current.size !== ids.length || !ids.every((id) => current.has(id))) {
    return jsonError(409, "La lista cambió mientras la ordenabas. Recargá y probá de nuevo.");
  }
  const results = await Promise.all(
    (ids as string[]).map((id, index) => supabase.from(table).update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return jsonError(500, failed.error.message);
  return null;
}
