import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, readJsonBody } from "@/lib/server/http";
import { reorderRows } from "@/lib/server/storeContent";

/** Nuevo orden de "Últimos ingresos": { ids } con todos los de la lista. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { ids } = await readJsonBody(request);
  const failed = await reorderRows("home_latest_products", ids);
  return failed ?? jsonData({ ids });
}
