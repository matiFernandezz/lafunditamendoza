import "server-only";
import type { NextRequest } from "next/server";
import { jsonData, jsonError } from "./http";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Errores propios de las funciones SQL de gestión de colores
// (supabase/migrations/20261007120000_color_management.sql).
const STATUS_BY_CODE: Record<string, number> = { CC400: 400, CC403: 400, CC404: 404 };

/** "1" o "true" en la query (?dry_run=1) o un booleano en el body. */
export function isTrue(value: unknown): boolean {
  return value === true || value === "1" || value === "true";
}

export function queryFlag(request: NextRequest, name: string): boolean {
  return isTrue(request.nextUrl.searchParams.get(name));
}

/** Llama a una función de colores y traduce sus errores al formato del panel. */
export async function colorRpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin().rpc(fn, args);
  if (error) return jsonError(STATUS_BY_CODE[error.code] ?? 500, error.message);
  return jsonData(data);
}
