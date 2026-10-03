import "server-only";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/server/http";

/**
 * Exige una sesión válida de Supabase Auth (cookies de @supabase/ssr). Va
 * primero en TODOS los Route Handlers del panel:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 *
 * Devuelve la respuesta 401 lista para retornar, o null si hay sesión. El
 * registro público está deshabilitado, así que todo usuario con sesión es admin.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return jsonError(401, "No autorizado: iniciá sesión de nuevo.");
  }
  return null;
}
