import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_VOID_REASON_LENGTH = 300;

// Códigos propios que levanta la función SQL void_sale, con un mensaje para
// mostrar tal cual en el panel (el de Postgres trae timestamps crudos).
const VOID_ERRORS: Record<string, { status: number; message: string }> = {
  VS400: { status: 400, message: "El motivo de la anulación es obligatorio." },
  VS404: { status: 404, message: "Esa venta no existe." },
  VS409: { status: 409, message: "Esta venta ya estaba anulada." },
};

export async function POST(request: NextRequest, ctx: RouteContext<"/api/sales/[id]/void">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  const { reason } = await readJsonBody(request);

  if (!isUuid(id)) {
    return jsonError(400, "id debe ser un uuid valido");
  }

  if (typeof reason !== "string" || reason.trim() === "" || reason.trim().length > MAX_VOID_REASON_LENGTH) {
    return jsonError(400, `reason es obligatorio (texto de hasta ${MAX_VOID_REASON_LENGTH} caracteres)`);
  }

  const { data, error } = await supabaseAdmin().rpc("void_sale", {
    p_sale_id: id,
    p_reason: reason.trim(),
  });

  if (error) {
    const known = VOID_ERRORS[error.code];
    return jsonError(known?.status ?? 500, known?.message ?? error.message);
  }

  return jsonData(data);
}
