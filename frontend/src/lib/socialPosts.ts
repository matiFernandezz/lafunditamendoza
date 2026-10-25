// Links de publicaciones de Instagram y TikTok que se muestran en Nosotros.
// Lo usan el panel (para validar lo que se pega) y la página (para embeberlas).

export type SocialNetwork = "instagram" | "tiktok";

export type ParsedSocialPost = {
  network: SocialNetwork;
  /** Link limpio (sin ?igsh=… ni otros parámetros). */
  url: string;
  /** Código del post de Instagram o id del video de TikTok. */
  id: string;
};

const INSTAGRAM = /^https:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/i;
const TIKTOK = /^https:\/\/(?:www\.)?tiktok\.com\/(@[\w.]+)\/video\/(\d+)/i;

/**
 * Reconoce el link de un post o reel de Instagram o de un video de TikTok.
 * null si no es ninguno (perfiles, links cortos vm.tiktok.com, etc.).
 */
export function parseSocialPost(value: unknown): ParsedSocialPost | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const ig = raw.match(INSTAGRAM);
  if (ig) return { network: "instagram", url: `https://www.instagram.com/${ig[1].toLowerCase()}/${ig[2]}/`, id: ig[2] };
  const tt = raw.match(TIKTOK);
  if (tt) return { network: "tiktok", url: `https://www.tiktok.com/${tt[1]}/video/${tt[2]}`, id: tt[2] };
  return null;
}
