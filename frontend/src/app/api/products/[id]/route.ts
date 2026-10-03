import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
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
