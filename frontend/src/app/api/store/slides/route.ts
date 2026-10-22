import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SLIDE_SELECT, parseSlideFields } from "./fields";

/** Slides del carrusel de la portada, en orden. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin()
    .from("home_slides")
    .select(SLIDE_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return jsonError(500, error.message);
  return jsonData(data);
}

/** Agrega un slide al final. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = parseSlideFields(await readJsonBody(request), false);
  if ("error" in parsed) return jsonError(400, parsed.error);

  const supabase = supabaseAdmin();
  const { data: last } = await supabase
    .from("home_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("home_slides")
    .insert({ ...parsed.fields, sort_order: (last?.sort_order ?? -1) + 1 })
    .select(SLIDE_SELECT)
    .single();
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo agregar la foto");
  return jsonData(data, 201);
}
