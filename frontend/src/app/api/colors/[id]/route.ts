import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { COLOR_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HEX_REGEX, MAX_COLOR_NAME_LENGTH } from "../limits";

// Edita el nombre y/o el hex. Elegir un hex lo saca de "sin color asignado".
// Renombrar un color renombra el texto de sus variantes (trigger en la base).
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/colors/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { name, hex } = await readJsonBody(request);

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (name === undefined && hex === undefined) return jsonError(400, "Mandá name o hex");

  const update: { name?: string; hex?: string; assigned?: boolean } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_COLOR_NAME_LENGTH) {
      return jsonError(400, `name es obligatorio (texto de hasta ${MAX_COLOR_NAME_LENGTH} caracteres)`);
    }
    update.name = name.trim();
  }
  if (hex !== undefined) {
    if (typeof hex !== "string" || !HEX_REGEX.test(hex)) {
      return jsonError(400, "hex debe ser un color como #1a2b3c");
    }
    update.hex = hex.toLowerCase();
    update.assigned = true;
  }

  const { data, error } = await supabaseAdmin()
    .from("colors")
    .update(update)
    .eq("id", id)
    .select(COLOR_SELECT)
    .maybeSingle();

  if (error?.code === "23505") return jsonError(409, "Ya existe un color con ese nombre");
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "No existe un color con ese id");
  return jsonData(data);
}

// "No es un color": lo saca de la lista. Sus variantes conservan el texto como
// descripción y sus fotos pasan a ser generales (FK on delete set null).
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/colors/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { data, error } = await supabaseAdmin().from("colors").delete().eq("id", id).select("id").maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "No existe un color con ese id");
  return new Response(null, { status: 204 });
}
