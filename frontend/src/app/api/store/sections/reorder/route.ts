import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SECTION_KEYS, isSectionKey } from "../keys";

/** Nuevo orden de las secciones: { keys } con todas, en el orden nuevo. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { keys } = await readJsonBody(request);
  if (
    !Array.isArray(keys) ||
    keys.length !== SECTION_KEYS.length ||
    !keys.every(isSectionKey) ||
    new Set(keys).size !== keys.length
  ) {
    return jsonError(400, `keys debe tener las ${SECTION_KEYS.length} secciones, sin repetir`);
  }
  const supabase = supabaseAdmin();
  const results = await Promise.all(
    keys.map((key, index) => supabase.from("home_sections").update({ sort_order: index }).eq("key", key)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return jsonError(500, failed.error.message);
  return jsonData({ keys });
}
