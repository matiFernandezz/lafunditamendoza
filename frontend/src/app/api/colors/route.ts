import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { COLOR_SELECT } from "@/lib/server/selects";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HEX_REGEX, MAX_COLOR_NAME_LENGTH } from "./limits";

// Lista de colores del panel, con cuántas variantes usa cada uno.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = supabaseAdmin();
  const [colors, variants] = await Promise.all([
    supabase.from("colors").select(COLOR_SELECT).order("sort_order").order("name"),
    supabase.from("product_variants").select("color_id").not("color_id", "is", null),
  ]);

  if (colors.error) return jsonError(500, colors.error.message);
  if (variants.error) return jsonError(500, variants.error.message);

  const counts = new Map<string, number>();
  for (const row of variants.data) counts.set(row.color_id, (counts.get(row.color_id) ?? 0) + 1);

  return jsonData(colors.data.map((color) => ({ ...color, variant_count: counts.get(color.id) ?? 0 })));
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { name, hex } = await readJsonBody(request);

  if (typeof name !== "string" || name.trim() === "" || name.trim().length > MAX_COLOR_NAME_LENGTH) {
    return jsonError(400, `name es obligatorio (texto de hasta ${MAX_COLOR_NAME_LENGTH} caracteres)`);
  }
  if (typeof hex !== "string" || !HEX_REGEX.test(hex)) {
    return jsonError(400, "hex debe ser un color como #1a2b3c");
  }

  const { data, error } = await supabaseAdmin()
    .from("colors")
    .insert({ name: name.trim(), hex: hex.toLowerCase(), assigned: true })
    .select(COLOR_SELECT)
    .single();

  if (error?.code === "23505") return jsonError(409, `Ya existe un color llamado "${name.trim()}"`);
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo crear el color");
  return jsonData({ ...data, variant_count: 0 }, 201);
}
