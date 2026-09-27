import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireEnv } from "@/lib/requireEnv";

const BACKEND_URL = requireEnv(process.env.BACKEND_URL, "BACKEND_URL");
const BACKEND_API_KEY = requireEnv(process.env.BACKEND_API_KEY, "BACKEND_API_KEY");

const EMPTY_BODY_STATUS = new Set([204, 205, 304]);

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

  // 204/205/304 no admiten body: construir un Response con body y uno de
  // esos status tira TypeError. Pasa de verdad: el DELETE de una foto de
  // producto responde 204 y rompía el borrado con un 500.
  if (EMPTY_BODY_STATUS.has(res.status)) {
    return new NextResponse(null, { status: res.status });
  }

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

/**
 * Igual que forwardToBackend, pero para multipart/form-data (subida de
 * archivos): reenvía los bytes crudos del body y el Content-Type original
 * (con su boundary) tal cual, en vez de parsear y reconstruir el FormData.
 */
export async function forwardMultipartToBackend(path: string, request: NextRequest) {
  const body = await request.arrayBuffer();

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/octet-stream",
      "x-api-key": BACKEND_API_KEY,
    },
    body,
  });

  const responseBody = await res.text();
  return new NextResponse(responseBody, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
