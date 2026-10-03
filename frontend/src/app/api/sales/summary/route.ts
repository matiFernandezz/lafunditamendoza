import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseRange } from "../range";

// Todo el cálculo vive en la función SQL sales_summary: acá no se traen filas.
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const range = parseRange(request.nextUrl.searchParams);
  if ("error" in range) return jsonError(400, range.error);
  if (!range.from || !range.to) return jsonError(400, "from y to son obligatorios");

  const { data, error } = await supabaseAdmin().rpc("sales_summary", {
    p_from: range.from,
    p_to: range.to,
  });

  if (error) return jsonError(500, error.message);
  return jsonData(data);
}
