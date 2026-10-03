import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/requireEnv";

let client: SupabaseClient | undefined;

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
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
