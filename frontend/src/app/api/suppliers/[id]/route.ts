import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { SUPPLIER_SELECT } from "@/lib/server/selects";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseSupplierFields } from "../supplierFields";

/** Edita nombre, contacto, forma de pago, envío estimado o notas. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/suppliers/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const parsed = parseSupplierFields(await readJsonBody(request), true);
  if ("error" in parsed) return jsonError(400, parsed.error);
  if (Object.keys(parsed.fields).length === 0) return jsonError(400, "No hay nada para cambiar");

  const { data, error } = await supabaseAdmin()
    .from("suppliers")
    .update(parsed.fields)
    .eq("id", id)
    .select(SUPPLIER_SELECT)
    .maybeSingle();

  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Ese proveedor no existe.");
  return jsonData(data);
}
