import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { MOTIF_SELECT } from "@/lib/server/selects";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_COLOR_NAME_LENGTH } from "../colors/limits";

// Lista de motivos del panel, con cuántas variantes usa cada uno.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = supabaseAdmin();
  const [motifs, variants] = await Promise.all([
    supabase.from("motifs").select(MOTIF_SELECT).order("sort_order").order("name"),
    supabase.from("product_variants").select("motif_id").not("motif_id", "is", null),
  ]);

  if (motifs.error) return jsonError(500, motifs.error.message);
  if (variants.error) return jsonError(500, variants.error.message);

  const counts = new Map<string, number>();
  for (const row of variants.data) counts.set(row.motif_id, (counts.get(row.motif_id) ?? 0) + 1);

  return jsonData(motifs.data.map((motif) => ({ ...motif, variant_count: counts.get(motif.id) ?? 0 })));
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { name } = await readJsonBody(request);

  if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_COLOR_NAME_LENGTH) {
    return jsonError(400, `name es obligatorio (texto de hasta ${MAX_COLOR_NAME_LENGTH} caracteres)`);
  }

  const { data, error } = await supabaseAdmin()
    .from("motifs")
    .insert({ name: name.trim() })
    .select(MOTIF_SELECT)
    .single();

  if (error?.code === "23505") return jsonError(409, `Ya existe un motivo llamado "${name.trim()}"`);
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo crear el motivo");
  return jsonData({ ...data, variant_count: 0 }, 201);
}
