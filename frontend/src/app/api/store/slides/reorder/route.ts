import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, readJsonBody } from "@/lib/server/http";
import { reorderRows } from "@/lib/server/storeContent";

/** Nuevo orden del carrusel: { ids } con todos los slides. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { ids } = await readJsonBody(request);
  const failed = await reorderRows("home_slides", ids);
  return failed ?? jsonData({ ids });
}
