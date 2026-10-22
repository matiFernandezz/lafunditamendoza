import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SECTION_SELECT } from "./keys";

/** Secciones de la home (debajo de "Elegí tu iPhone"), en orden. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin().from("home_sections").select(SECTION_SELECT).order("sort_order");
  if (error) return jsonError(500, error.message);
  return jsonData(data);
}
