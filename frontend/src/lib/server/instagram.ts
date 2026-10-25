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
/**
 * Hasta cuándo sirve el respaldo (los últimos posts guardados) si Meta falla:
 * las fotos de Instagram vienen con un link que vence a los pocos días, así
 * que después de eso es mejor mostrar el link al perfil que fotos rotas.
 */
const FALLBACK_MAX_AGE_MS = 3 * DAY_MS;

export type InstagramPost = {
  id: string;
  permalink: string;
  /** Foto (o portada, si es video). */
  imageUrl: string;
  isVideo: boolean;
  caption: string;
};

export type InstagramStatus =
  | { connected: false }
  | {
      connected: true;
      username: string | null;
      expiresAt: string;
      /** Lo último que respondió Instagram cuando falló (null = anda bien). */
      lastError: string | null;
      lastErrorAt: string | null;
      /** Cuándo se guardaron los posts del respaldo. */
      cachedAt: string | null;
    };

type Connection = {
  access_token: string;
  username: string | null;
  expires_at: string;
  refreshed_at: string;
  cached_posts: InstagramPost[] | null;
  cached_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
};

async function readConnection(): Promise<Connection | null> {
  const { data } = await supabaseAdmin()
    .from("instagram_connection")
    .select("access_token, username, expires_at, refreshed_at, cached_posts, cached_at, last_error, last_error_at")
    .eq("id", 1)
    .maybeSingle();
  return data;
}

/** El mensaje de error que da Instagram ("API access blocked.", …), o el código HTTP. */
async function errorOf(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error?.message === "string" ? body.error.message : `Instagram respondió ${res.status}`;
}

/** Anota que Instagram falló (sin escribir en cada visita: solo si cambió o pasó una hora). */
async function recordFailure(connection: Connection, message: string) {
  const fresh = connection.last_error_at && Date.now() - new Date(connection.last_error_at).getTime() < 60 * 60 * 1000;
  if (connection.last_error === message && fresh) return;
  await supabaseAdmin()
    .from("instagram_connection")
    .update({ last_error: message, last_error_at: new Date().toISOString() })
    .eq("id", 1);
}

/** Valida una clave nueva contra Instagram y la guarda. Devuelve el usuario, o el error. */
export async function connectInstagram(token: string): Promise<{ username: string } | { error: string }> {
  const res = await fetch(`${GRAPH}/me?fields=username&access_token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || typeof body?.username !== "string") {
    return {
      error:
        "Instagram no aceptó esa clave. Fijate de copiarla entera, sin espacios, y que sea de la cuenta de la tienda.",
    };
  }
  const { error } = await supabaseAdmin()
    .from("instagram_connection")
    .upsert({
      id: 1,
      access_token: token,
      username: body.username,
      expires_at: new Date(Date.now() + TOKEN_DAYS * DAY_MS).toISOString(),
      refreshed_at: new Date().toISOString(),
      last_error: null,
      last_error_at: null,
    });
  if (error) return { error: error.message };
  return { username: body.username };
}

export async function disconnectInstagram() {
  await supabaseAdmin().from("instagram_connection").delete().eq("id", 1);
}

/**
 * Estado de la conexión para el panel. Le pregunta en el momento a Instagram si
 * la clave sirve (así el aviso de "bloqueado" no depende de que alguien haya
 * entrado a la tienda) y lo anota.
 */
export async function instagramStatus(): Promise<InstagramStatus> {
  let connection = await readConnection();
  if (!connection) return { connected: false };

  try {
    // Pide un post, como la página: Meta puede responder el usuario y bloquear los posts.
    const res = await fetch(`${GRAPH}/me/media?fields=id&limit=1&access_token=${encodeURIComponent(connection.access_token)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      if (connection.last_error) {
        await supabaseAdmin()
          .from("instagram_connection")
          .update({ last_error: null, last_error_at: null })
          .eq("id", 1);
      }
    } else {
      await recordFailure(connection, await errorOf(res));
    }
    connection = (await readConnection()) ?? connection;
  } catch {
    // Sin respuesta de Instagram: se muestra lo último que se sabe.
  }

  return {
    connected: true,
    username: connection.username,
    expiresAt: connection.expires_at,
    lastError: connection.last_error,
    lastErrorAt: connection.last_error_at,
    cachedAt: connection.cached_at,
  };
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
 * Los últimos posts de la cuenta (fotos, carruseles y reels). Si Instagram
 * falla, los últimos que se trajeron bien (de hasta 3 días). null si no está
 * conectada o no hay respaldo: la página usa entonces los links pegados a mano.
 */
export async function getInstagramPosts(limit = 9): Promise<InstagramPost[] | null> {
  const connection = await readConnection();
  if (!connection) return null;

  const fallback = () =>
    connection.cached_posts?.length &&
    connection.cached_at &&
    Date.now() - new Date(connection.cached_at).getTime() < FALLBACK_MAX_AGE_MS
      ? connection.cached_posts
      : null;

  try {
    const token = await freshToken(connection);
    const fields = "id,media_type,media_url,thumbnail_url,permalink,caption";
    const res = await fetch(
      `${GRAPH}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`,
      {
        next: { revalidate: MEDIA_REVALIDATE },
      },
    );
    if (!res.ok) {
      await recordFailure(connection, await errorOf(res));
      return fallback();
    }
    const body = (await res.json()) as {
      data?: {
        id: string;
        media_type: string;
        media_url?: string;
        thumbnail_url?: string;
        permalink: string;
        caption?: string;
      }[];
    };
    const posts = (body.data ?? [])
      .map((m) => ({
        id: m.id,
        permalink: m.permalink,
        imageUrl: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? "",
        isVideo: m.media_type === "VIDEO",
        caption: m.caption ?? "",
      }))
      .filter((p) => p.imageUrl !== "");

    // Respaldo: se guarda si cambió, si había un error o si tiene más de 6 horas
    // (para que sus fotos no venzan), así no se escribe en cada visita.
    const stale = !connection.cached_at || Date.now() - new Date(connection.cached_at).getTime() > 6 * 60 * 60 * 1000;
    if (
      posts.length > 0 &&
      (stale || connection.last_error || JSON.stringify(posts) !== JSON.stringify(connection.cached_posts))
    ) {
      await supabaseAdmin()
        .from("instagram_connection")
        .update({ cached_posts: posts, cached_at: new Date().toISOString(), last_error: null, last_error_at: null })
        .eq("id", 1);
    }
    return posts;
  } catch {
    return fallback();
  }
}
