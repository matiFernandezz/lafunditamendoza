import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/requireEnv";

const url = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

/** Cliente de Supabase para Client Components: guarda la sesión en cookies (no localStorage). */
export function createClient() {
  return createBrowserClient(url, anonKey);
}
