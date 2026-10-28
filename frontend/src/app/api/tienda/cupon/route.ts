import type { NextRequest } from "next/server";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_CODE_LENGTH = 40;

// Pública (sin sesión de admin): el carrito pregunta si un código vale para
// mostrar el descuento. Solo devuelve el porcentaje y cuándo vence; al reservar,
// create_web_order lo vuelve a validar y es el que aplica el descuento.
export async function POST(request: NextRequest) {
  const { code } = await readJsonBody(request);
  const text = typeof code === "string" ? code.trim() : "";
  if (text === "" || text.length > MAX_CODE_LENGTH) {
    return jsonError(400, "Escribí el código del cupón.");
  }

  const { data, error } = await supabaseAdmin().rpc("valid_coupon", { p_code: text });
  if (error) return jsonError(500, "No pudimos revisar el cupón. Probá de nuevo en un rato.");
  if (!data || !data.code) return jsonError(404, "Ese cupón no existe o ya venció.");

  return jsonData({ code: data.code, percent: data.percent, expires_at: data.expires_at });
}
