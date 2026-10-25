import type { NextRequest } from "next/server";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/productImages";
import { requireAdmin } from "@/lib/server/auth";
import { queryFlag } from "@/lib/server/colorManagement";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { PRODUCT_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from "../limits";

// Edita el nombre y/o la descripción (al menos uno de los dos). Una
// descripción vacía o null la borra.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { name, description } = await readJsonBody(request);

  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }

  if (name === undefined && description === undefined) {
    return jsonError(400, "Mandá name o description");
  }

  const update: { name?: string; description?: string | null } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_NAME_LENGTH) {
      return jsonError(400, `name es obligatorio (texto de hasta ${MAX_NAME_LENGTH} caracteres)`);
    }
    update.name = name.trim();
  }

  if (description !== undefined) {
    if (
      description !== null &&
      (typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH)
    ) {
      return jsonError(400, `description debe ser texto de hasta ${MAX_DESCRIPTION_LENGTH} caracteres`);
    }
    const trimmed = typeof description === "string" ? description.trim() : "";
    update.description = trimmed === "" ? null : trimmed;
  }

  const { data, error } = await supabaseAdmin()
    .from("products")
    .update(update)
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "No existe un producto con ese id");
  return jsonData(data);
}

// "Eliminar producto": si ninguna variante tiene ventas, compras ni reservas, se
// borra entero (y sus fotos del bucket). Si tiene historial, queda archivado:
// oculto en la tienda y en el panel, pero el historial lo sigue nombrando. Con
// stock y sin ?force=1 responde blocked: true con las unidades, para pedir
// confirmación. ?dry_run=1 solo informa.
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("delete_product", {
    p_product_id: id,
    p_force: queryFlag(request, "force"),
    p_dry_run: queryFlag(request, "dry_run"),
  });
  if (error) return jsonError(error.code === "CC404" ? 404 : 500, error.message);

  // Si se borró, sus fotos quedan huérfanas en Storage: se sacan (si falla, no
  // importa: nadie las ve).
  const marker = `/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const paths = ((data.images ?? []) as string[])
    .filter((url) => url.includes(marker))
    .map((url) => url.slice(url.indexOf(marker) + marker.length));
  if (paths.length > 0) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);

  delete data.images;
  return jsonData(data);
}
