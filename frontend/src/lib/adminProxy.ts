import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireEnv } from "@/lib/requireEnv";

const BACKEND_URL = requireEnv(process.env.BACKEND_URL, "BACKEND_URL");
const BACKEND_API_KEY = requireEnv(process.env.BACKEND_API_KEY, "BACKEND_API_KEY");

/**
 * Devuelve los claims del JWT si hay una sesión de Supabase Auth válida
 * (verificados localmente, sin ir al servidor de Auth), o null si no.
 */
export async function requireSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return null;
  return data.claims;
}

export function unauthorized() {
  return NextResponse.json(
    { error: "No autorizado: iniciá sesión de nuevo." },
    { status: 401 },
  );
}

/**
 * Reenvía la request al backend real agregando x-api-key (BACKEND_API_KEY,
 * server-only) y devuelve la respuesta tal cual al navegador. La API key
 * nunca llega al cliente: solo la ve este código, que corre en el servidor.
 */
export async function forwardToBackend(path: string, init?: RequestInit) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      "x-api-key": BACKEND_API_KEY,
    },
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
