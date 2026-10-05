import "server-only";
import type { NextRequest } from "next/server";
import { jsonData, jsonError } from "./http";
import { isUuid } from "./validate";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Errores propios de las funciones SQL de colores y motivos
// (supabase/migrations/20261007120000 y 20261008120000).
const STATUS_BY_CODE: Record<string, number> = { CC400: 400, CC403: 400, CC404: 404 };

/** "1" o "true" en la query (?dry_run=1) o un booleano en el body. */
export function isTrue(value: unknown): boolean {
  return value === true || value === "1" || value === "true";
}

export function queryFlag(request: NextRequest, name: string): boolean {
  return isTrue(request.nextUrl.searchParams.get(name));
}

/**
 * Lista de modelos elegidos: undefined/null = todos. Devuelve `false` si vino
 * algo que no es una lista de uuids.
 */
export function parseModelIds(value: unknown): string[] | null | false {
  if (value === undefined || value === null) return null;
  const list = typeof value === "string" ? value.split(",").filter(Boolean) : value;
  if (!Array.isArray(list) || list.length === 0 || !list.every(isUuid)) return false;
  return list;
}

/** Llama a una función de colores/motivos y traduce sus errores al formato del panel. */
export async function colorRpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin().rpc(fn, args);
  if (error) return jsonError(STATUS_BY_CODE[error.code] ?? 500, error.message);
  return jsonData(data);
}

/**
 * DELETE de un color o un motivo. Solo se elimina si no lo usa ninguna
 * variante; si está en uso responde 409 (hay que unirlo con otro). Con
 * ?keep_text=1 se saca igual de la lista y sus variantes conservan el nombre
 * como descripción libre (la FK es on delete set null) y sus fotos pasan a
 * generales: es el "no es un color".
 */
export async function deleteUnusedAttribute(kind: "color" | "motif", id: string, request: NextRequest) {
  const supabase = supabaseAdmin();
  const table = kind === "color" ? "colors" : "motifs";
  const column = kind === "color" ? "color_id" : "motif_id";
  const noun = kind === "color" ? "color" : "motivo";

  if (!queryFlag(request, "keep_text")) {
    const { count, error } = await supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq(column, id);
    if (error) return jsonError(500, error.message);
    if ((count ?? 0) > 0) {
      return jsonError(
        409,
        `${count === 1 ? "Lo usa 1 variante" : `Lo usan ${count} variantes`}: unilo con otro ${noun} en vez de eliminarlo`,
      );
    }
  }

  const { data, error } = await supabase.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error) return jsonError(500, error.message);
  if (!data) return jsonError(404, `No existe un ${noun} con ese id`);
  return new Response(null, { status: 204 });
}
