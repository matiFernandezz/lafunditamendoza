import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { connectInstagram, disconnectInstagram, instagramStatus } from "@/lib/server/instagram";

/** Si Instagram está conectado, con qué cuenta y hasta cuándo dura la clave (la clave no sale). */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return jsonData(await instagramStatus());
}

/** Conecta Instagram con una clave de acceso nueva: { token }. */
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { token } = await readJsonBody(request);
  if (typeof token !== "string" || token.trim().length < 20 || token.trim().length > 1000) {
    return jsonError(400, "Pegá la clave de acceso que te da Meta (es un texto largo).");
  }
  const result = await connectInstagram(token.trim());
  if ("error" in result) return jsonError(400, result.error);
  return jsonData(await instagramStatus());
}

/** Desconecta Instagram: Nosotros vuelve a los links pegados a mano. */
export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return denied;
  await disconnectInstagram();
  return jsonData({ connected: false });
}
