import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isOptionalText, isPositiveInt, isPositiveNumber, isUuid } from "@/lib/server/validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTES_LENGTH = 1000;

type PurchaseItemInput = { variant_id: string; quantity: number; unit_cost: number };

function validateItems(items: unknown): items is PurchaseItemInput[] {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const { variant_id, quantity, unit_cost } = item as Record<string, unknown>;
    return isUuid(variant_id) && isPositiveInt(quantity) && isPositiveNumber(unit_cost);
  });
}

/** YYYY-MM-DD que además existe en el calendario (2026-02-31 no). */
function isRealDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Errores de la función SQL create_purchase que son culpa de los datos enviados.
const BAD_REQUEST_CODES = new Set(["CP400", "CP404", "P0001"]);

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { supplier_id, purchase_date, notes, items } = await readJsonBody(request);

  if (!isUuid(supplier_id)) {
    return jsonError(400, "supplier_id debe ser un uuid valido");
  }

  if (purchase_date !== undefined && !isRealDate(purchase_date)) {
    return jsonError(400, "purchase_date debe tener formato YYYY-MM-DD (o no enviarse)");
  }

  if (!isOptionalText(notes, MAX_NOTES_LENGTH)) {
    return jsonError(400, `notes debe ser texto de hasta ${MAX_NOTES_LENGTH} caracteres (o no enviarse)`);
  }

  if (!validateItems(items)) {
    return jsonError(
      400,
      "items debe ser un array no vacio de { variant_id (uuid), quantity (entero > 0), unit_cost (numero > 0) }",
    );
  }

  // Compra + items + stock en una sola transacción (función SQL create_purchase).
  const { data, error } = await supabaseAdmin().rpc("create_purchase", {
    p_supplier_id: supplier_id,
    p_purchase_date: purchase_date ?? null,
    p_notes: notes ?? null,
    p_items: items.map(({ variant_id, quantity, unit_cost }) => ({ variant_id, quantity, unit_cost })),
  });

  if (error) {
    return jsonError(BAD_REQUEST_CODES.has(error.code) ? 400 : 500, error.message);
  }

  return jsonData(data, 201);
}
