import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_TZ = "America/Argentina/Buenos_Aires";

function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("es-AR", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Inicio del panel (función SQL admin_dashboard). Query params: from/to (el
 * período), prev_from/prev_to (el tramo del período anterior para comparar),
 * todos instantes ISO, y tz (zona IANA del panel) para cortar los días.
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const instants: Record<string, string> = {};
  for (const name of ["from", "to", "prev_from", "prev_to"]) {
    const value = params.get(name);
    if (value === null || Number.isNaN(Date.parse(value))) {
      return jsonError(400, `${name} es obligatorio y debe ser una fecha ISO 8601 valida`);
    }
    instants[name] = new Date(value).toISOString();
  }
  if (instants.from >= instants.to) return jsonError(400, "from tiene que ser anterior a to");
  if (instants.prev_from >= instants.prev_to) return jsonError(400, "prev_from tiene que ser anterior a prev_to");

  const tz = params.get("tz") ?? DEFAULT_TZ;
  if (!isValidTimeZone(tz)) return jsonError(400, "tz debe ser una zona horaria valida");

  const { data, error } = await supabaseAdmin().rpc("admin_dashboard", {
    p_from: instants.from,
    p_to: instants.to,
    p_prev_from: instants.prev_from,
    p_prev_to: instants.prev_to,
    p_tz: tz,
  });

  if (error) return jsonError(500, error.message);
  return jsonData(data);
}
