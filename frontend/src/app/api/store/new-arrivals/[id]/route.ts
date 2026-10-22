import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { removeStoreImage } from "@/lib/server/storeContent";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ARRIVAL_SELECT, parseArrivalFields, withStock } from "../fields";

/** Cambia la foto recortada o el color del canto. Si cambia la foto, se borra la anterior. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/store/new-arrivals/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const parsed = parseArrivalFields(await readJsonBody(request), true);
  if ("error" in parsed) return jsonError(400, parsed.error);
  if (Object.keys(parsed.fields).length === 0) return jsonError(400, "No hay nada para cambiar");

  const supabase = supabaseAdmin();
  const { data: before } = await supabase.from("home_new_arrivals").select("image_url").eq("id", id).maybeSingle();
  if (!before) return jsonError(404, "Esa funda no está en Las funditas más vendidas.");

  const { data, error } = await supabase
    .from("home_new_arrivals")
    .update(parsed.fields)
    .eq("id", id)
    .select(ARRIVAL_SELECT)
    .single();
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo guardar");
  if (parsed.fields.image_url && parsed.fields.image_url !== before.image_url) await removeStoreImage(before.image_url);
  return jsonData(withStock(data));
}

/** Saca la funda de "Las funditas más vendidas" (el producto no se toca). */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/store/new-arrivals/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { data, error } = await supabaseAdmin()
    .from("home_new_arrivals")
    .delete()
    .eq("id", id)
    .select("image_url")
    .maybeSingle();
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Esa funda no está en Las funditas más vendidas.");
  await removeStoreImage(data.image_url);
  return jsonData({ id });
}
