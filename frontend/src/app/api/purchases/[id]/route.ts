import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { PURCHASE_DETAIL_SELECT } from "@/lib/server/selects";
import { isOptionalText, isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_NOTES_LENGTH = 1000;
const STATUSES = ["armando", "pagado", "en_camino", "recibida"];

// Códigos de las funciones SQL de pedidos.
const PURCHASE_ERRORS: Record<string, { status: number; message: string }> = {
  RP404: { status: 404, message: "Ese pedido no existe." },
  RP409: { status: 409, message: "Ese pedido ya está recibido: su stock ya entró." },
  PS400: { status: 400, message: "Ese estado no existe." },
};

function rpcError(error: { code: string; message: string }) {
  const known = PURCHASE_ERRORS[error.code];
  return jsonError(known?.status ?? 500, known?.message ?? error.message);
}

async function readPurchase(id: string) {
  return supabaseAdmin().from("purchases").select(PURCHASE_DETAIL_SELECT).eq("id", id).maybeSingle();
}

/** Un pedido con su proveedor y lo que se pidió (producto, modelo, precio de venta actual). */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/purchases/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { data, error } = await readPurchase(id);
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Ese pedido no existe.");
  return jsonData(data);
}

/**
 * Cambia el estado, el envío o las notas. Pasar a "recibida" suma el stock
 * (receive_purchase); los otros estados no lo tocan (set_purchase_status).
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/purchases/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { status, shipping_cost, notes } = await readJsonBody(request);

  if (status !== undefined && (typeof status !== "string" || !STATUSES.includes(status))) {
    return jsonError(400, `status debe ser uno de: ${STATUSES.join(", ")}`);
  }
  if (
    shipping_cost !== undefined &&
    (typeof shipping_cost !== "number" || !Number.isFinite(shipping_cost) || shipping_cost < 0)
  ) {
    return jsonError(400, "shipping_cost debe ser un numero mayor o igual a 0");
  }
  if (!isOptionalText(notes, MAX_NOTES_LENGTH)) {
    return jsonError(400, `notes debe ser texto de hasta ${MAX_NOTES_LENGTH} caracteres`);
  }

  const supabase = supabaseAdmin();

  const fields: Record<string, unknown> = {};
  if (shipping_cost !== undefined) fields.shipping_cost = shipping_cost;
  if (notes !== undefined) fields.notes = typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null;
  if (Object.keys(fields).length > 0) {
    const { data, error } = await supabase.from("purchases").update(fields).eq("id", id).select("id");
    if (error) return jsonError(500, error.message);
    if (!data || data.length === 0) return jsonError(404, "Ese pedido no existe.");
  }

  if (status !== undefined) {
    const { error } =
      status === "recibida"
        ? await supabase.rpc("receive_purchase", { p_purchase_id: id })
        : await supabase.rpc("set_purchase_status", { p_purchase_id: id, p_status: status });
    if (error) return rpcError(error);
  }

  const { data, error } = await readPurchase(id);
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, "Ese pedido no existe.");
  return jsonData(data);
}

/** Borra un pedido que todavía no llegó. */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/purchases/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!isUuid(id)) return jsonError(400, "id debe ser un uuid valido");

  const { error } = await supabaseAdmin().rpc("delete_purchase", { p_purchase_id: id });
  if (error) return rpcError(error);
  return jsonData({ id });
}
