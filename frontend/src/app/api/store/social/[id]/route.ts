import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Quita una publicación de la lista de Nosotros. */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/store/social/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { data, error } = await supabaseAdmin().from("social_posts").delete().eq("id", id).select("id").maybeSingle();
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Esa publicación no existe.");
  return jsonData({ id });
}
