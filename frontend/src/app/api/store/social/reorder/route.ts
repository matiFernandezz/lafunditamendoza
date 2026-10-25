import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, readJsonBody } from "@/lib/server/http";
import { reorderRows } from "@/lib/server/storeContent";

/** Nuevo orden de las publicaciones: { ids } con todas (de las dos redes). */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { ids } = await readJsonBody(request);
  const failed = await reorderRows("social_posts", ids);
  return failed ?? jsonData({ ids });
}
