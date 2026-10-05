import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { deleteUnusedAttribute } from "@/lib/server/colorManagement";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { MOTIF_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_COLOR_NAME_LENGTH } from "../../colors/limits";

// Renombra un motivo (y, por trigger, el texto de sus variantes).
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/motifs/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { name } = await readJsonBody(request);

  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");
  if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_COLOR_NAME_LENGTH) {
    return jsonError(400, `name es obligatorio (texto de hasta ${MAX_COLOR_NAME_LENGTH} caracteres)`);
  }

  const { data, error } = await supabaseAdmin()
    .from("motifs")
    .update({ name: name.trim() })
    .eq("id", id)
    .select(MOTIF_SELECT)
    .maybeSingle();

  if (error?.code === "23505") return jsonError(409, "Ya existe un motivo con ese nombre");
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "No existe un motivo con ese id");
  return jsonData(data);
}

// Elimina un motivo sin uso. Si lo usa alguna variante responde 409: hay que
// unirlo con otro, o mandar ?keep_text=1 para que sus variantes conserven el
// nombre como descripción libre.
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/motifs/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  return deleteUnusedAttribute("motif", id, request);
}
