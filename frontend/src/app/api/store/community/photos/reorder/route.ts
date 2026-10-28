import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, readJsonBody } from "@/lib/server/http";
import { reorderRows } from "@/lib/server/storeContent";

/** Nuevo orden de las fotos de Comunidad: { ids } con todas. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { ids } = await readJsonBody(request);
  const failed = await reorderRows("community_photos", ids);
  return failed ?? jsonData({ ids });
}
