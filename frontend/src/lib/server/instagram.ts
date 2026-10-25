import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Últimos posts de la cuenta de Instagram, con la API de Instagram con inicio
// de sesión de Instagram (graph.instagram.com). La clave se pega una vez en el
// panel › Tienda › Nosotros; dura 60 días y acá se renueva sola cuando le
// quedan menos de 10 (Instagram solo deja renovarla si tiene más de 24 horas).

const GRAPH = "https://graph.instagram.com";
const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_DAYS = 60;
const REFRESH_WHEN_DAYS_LEFT = 10;
/** Cada cuánto se vuelven a pedir los posts (segundos). */
const MEDIA_REVALIDATE = 1800;

export type InstagramPost = {
  id: string;
  permalink: string;
  /** Foto (o portada, si es video). */
  imageUrl: string;
  isVideo: boolean;
  caption: string;
};

export type InstagramStatus = { connected: false } | { connected: true; username: string | null; expiresAt: string };

type Connection = { access_token: string; username: string | null; expires_at: string; refreshed_at: string };

async function readConnection(): Promise<Connection | null> {
  const { data } = await supabaseAdmin()
    .from("instagram_connection")
    .select("access_token, username, expires_at, refreshed_at")
    .eq("id", 1)
    .maybeSingle();
  return data;
}

/** Valida una clave nueva contra Instagram y la guarda. Devuelve el usuario, o el error. */
export async function connectInstagram(token: string): Promise<{ username: string } | { error: string }> {
  const res = await fetch(`${GRAPH}/me?fields=username&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok || typeof body?.username !== "string") {
    return { error: "Instagram no aceptó esa clave. Fijate de copiarla entera, sin espacios, y que sea de la cuenta de la tienda." };
  }
  const { error } = await supabaseAdmin()
    .from("instagram_connection")
    .upsert({
      id: 1,
      access_token: token,
      username: body.username,
      expires_at: new Date(Date.now() + TOKEN_DAYS * DAY_MS).toISOString(),
      refreshed_at: new Date().toISOString(),
    });
  if (error) return { error: error.message };
  return { username: body.username };
}

export async function disconnectInstagram() {
  await supabaseAdmin().from("instagram_connection").delete().eq("id", 1);
}

export async function instagramStatus(): Promise<InstagramStatus> {
  const connection = await readConnection();
  return connection
    ? { connected: true, username: connection.username, expiresAt: connection.expires_at }
    : { connected: false };
}

/** Renueva la clave si está por vencer (y tiene más de un día). Devuelve la que hay que usar. */
async function freshToken(connection: Connection): Promise<string> {
  const daysLeft = (new Date(connection.expires_at).getTime() - Date.now()) / DAY_MS;
  const age = Date.now() - new Date(connection.refreshed_at).getTime();
  if (daysLeft > REFRESH_WHEN_DAYS_LEFT || age < DAY_MS) return connection.access_token;

  const res = await fetch(
    `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(connection.access_token)}`,
    { cache: "no-store" },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || typeof body?.access_token !== "string") return connection.access_token;

  const expiresIn = typeof body.expires_in === "number" ? body.expires_in * 1000 : TOKEN_DAYS * DAY_MS;
  await supabaseAdmin()
    .from("instagram_connection")
    .update({
      access_token: body.access_token,
      expires_at: new Date(Date.now() + expiresIn).toISOString(),
      refreshed_at: new Date().toISOString(),
    })
    .eq("id", 1);
  return body.access_token;
}

/**
 * Los últimos posts de la cuenta (fotos, carruseles y reels), o null si no
 * está conectada o Instagram no responde: la página usa entonces los links
 * pegados a mano.
 */
export async function getInstagramPosts(limit = 9): Promise<InstagramPost[] | null> {
  const connection = await readConnection();
  if (!connection) return null;

  try {
    const token = await freshToken(connection);
    const fields = "id,media_type,media_url,thumbnail_url,permalink,caption";
    const res = await fetch(`${GRAPH}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`, {
      next: { revalidate: MEDIA_REVALIDATE },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { id: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink: string; caption?: string }[];
    };
    return (body.data ?? [])
      .map((m) => ({
        id: m.id,
        permalink: m.permalink,
        imageUrl: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? "",
        isVideo: m.media_type === "VIDEO",
        caption: m.caption ?? "",
      }))
      .filter((p) => p.imageUrl !== "");
  } catch {
    return null;
  }
}
