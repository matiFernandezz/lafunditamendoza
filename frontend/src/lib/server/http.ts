import "server-only";
import { NextResponse } from "next/server";

// Mismo formato que devolvía el backend Express, así las pantallas no cambian:
// errores como { error: "mensaje" } y éxitos como { data: ... }.

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonData(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

/**
 * Body JSON como objeto. Sin body, con JSON inválido o con algo que no es un
 * objeto devuelve {}: cada handler valida sus campos y responde el 400 puntual.
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // Body vacío o JSON inválido.
  }
  return {};
}
