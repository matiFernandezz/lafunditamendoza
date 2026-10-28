import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseRange } from "../sales/range";

const MOVEMENT_SELECT =
  "id, occurred_at, kind, direction, account, amount, category, description, sale_id, purchase_id, transfer_group, voided_at, void_reason";
const MAX_ROWS = 500;

// Códigos propios de create_cash_movement: el mensaje viaja tal cual al panel.
const CASH_ERRORS: Record<string, number> = { CM400: 400 };

/**
 * Caja: saldos y totales del período (los calcula la función SQL cash_summary),
 * los movimientos del período (los anulados incluidos, tachados en el panel) y
 * las categorías ya usadas, para sugerirlas al cargar un gasto.
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const range = parseRange(request.nextUrl.searchParams);
  if ("error" in range) return jsonError(400, range.error);
  if (!range.from || !range.to) return jsonError(400, "from y to son obligatorios");

  const supabase = supabaseAdmin();
  const [summary, movements, categories] = await Promise.all([
    supabase.rpc("cash_summary", { p_from: range.from, p_to: range.to }),
    supabase
      .from("cash_movements")
      .select(MOVEMENT_SELECT)
      .gte("occurred_at", range.from)
      .lt("occurred_at", range.to)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    supabase.from("cash_movements").select("category").in("kind", ["gasto", "aporte", "retiro"]).not("category", "is", null),
  ]);
  const error = summary.error ?? movements.error ?? categories.error;
  if (error) return jsonError(500, error.message);

  const used = [...new Set((categories.data ?? []).map((row) => row.category as string))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  return jsonData({ summary: summary.data, movements: movements.data, categories: used });
}

/** Carga un movimiento manual: aporte, retiro, gasto, transferencia entre cuentas o ajuste. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody(request);
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  const occurredAt = text(body.occurred_at);
  if (occurredAt !== null && Number.isNaN(Date.parse(occurredAt))) {
    return jsonError(400, "La fecha no es válida.");
  }

  const { data, error } = await supabaseAdmin().rpc("create_cash_movement", {
    p_kind: text(body.kind),
    p_direction: text(body.direction),
    p_account: text(body.account),
    p_to_account: text(body.to_account),
    p_amount: typeof body.amount === "number" ? body.amount : null,
    p_category: text(body.category),
    p_description: text(body.description),
    p_occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
  });
  if (error) return jsonError(CASH_ERRORS[error.code] ?? 500, error.message);
  return jsonData(data, 201);
}
