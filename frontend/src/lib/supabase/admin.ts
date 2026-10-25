import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/requireEnv";

let client: SupabaseClient | undefined;

/**
 * fetch que reintenta cuando Supabase rechaza el pedido con "JWT issued at
 * future": la puerta de entrada de Supabase arma el token con su reloj y la
 * base, con el reloj apenas atrasado, lo ve "del futuro". Es un desfase de un
 * segundo de su lado; esperar un poco y repetir lo resuelve.
 */
async function fetchWithClockRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(input, init);
    if (res.status !== 401 || attempt >= 2) return res;
    const body = await res.clone().text();
    if (!body.includes("issued at future")) return res;
    await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
  }
}

/**
 * Cliente de Supabase con la secret key (rol service_role: ignora RLS).
 * Solo para código de servidor: Route Handlers y Server Components. La clave
 * nunca lleva prefijo NEXT_PUBLIC_ y `server-only` rompe el build si este
 * archivo se llega a importar desde un Client Component.
 */
export function supabaseAdmin(): SupabaseClient {
  client ??= createClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchWithClockRetry } },
  );
  return client;
}
