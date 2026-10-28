import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { isStoreImageUrl } from "@/lib/server/storeContent";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Agrega una foto al final del carrusel de Comunidad. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { image_url } = await readJsonBody(request);
  if (!isStoreImageUrl(image_url)) return jsonError(400, "image_url tiene que ser una foto subida desde Tienda");

  const supabase = supabaseAdmin();
  const { data: last } = await supabase
    .from("community_photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("community_photos")
    .insert({ image_url, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("id, sort_order, image_url")
    .single();
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo agregar la foto");
  return jsonData(data, 201);
}
