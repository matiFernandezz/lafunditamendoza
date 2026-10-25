import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { jsonData, jsonError, readJsonBody } from "@/lib/server/http";
import { parseSocialPost } from "@/lib/socialPosts";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Agrega una publicación (link de Instagram o TikTok) al final de la lista. */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const post = parseSocialPost((await readJsonBody(request)).url);
  if (!post) {
    return jsonError(
      400,
      "Pegá el link de un post o reel de Instagram (instagram.com/p/… o /reel/…) o de un video de TikTok (tiktok.com/@usuario/video/…).",
    );
  }

  const supabase = supabaseAdmin();
  const { data: existing } = await supabase.from("social_posts").select("id").eq("url", post.url).maybeSingle();
  if (existing) return jsonError(409, "Esa publicación ya está en la lista.");

  const { data: last } = await supabase
    .from("social_posts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("social_posts")
    .insert({ network: post.network, url: post.url, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("id, network, url, sort_order")
    .single();
  if (error || !data) return jsonError(500, error?.message ?? "No se pudo agregar la publicación");
  return jsonData(data, 201);
}
