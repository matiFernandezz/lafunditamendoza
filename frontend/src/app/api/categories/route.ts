import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin()
    .from("categories")
    .select("id, name, parent_id")
    .order("name", { ascending: true });

  if (error) return jsonError(500, error.message);
  return jsonData(data);
}
