import "server-only";
import { isStoreImageUrl } from "@/lib/server/storeContent";

export const SLIDE_SELECT = "id, sort_order, image_url, mobile_image_url, alt, kind, label, title, cta_label, cta_href, position, dim";

const KINDS = ["rango", "titulo", "logo", "foto"];

const text = (value: unknown, max: number) =>
  value === null || (typeof value === "string" && value.length <= max);
const clean = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

/**
 * Campos editables de un slide. `partial`: solo los que vienen (PATCH); si no,
 * la foto es obligatoria (alta). Devuelve las columnas limpias o el error.
 */
export function parseSlideFields(
  body: Record<string, unknown>,
  partial: boolean,
): { fields: Record<string, unknown> } | { error: string } {
  const { image_url, mobile_image_url, alt, kind, label, title, cta_label, cta_href, position, dim } = body;
  const fields: Record<string, unknown> = {};

  if (image_url !== undefined || !partial) {
    if (!isStoreImageUrl(image_url)) return { error: "image_url tiene que ser una foto subida desde Tienda" };
    fields.image_url = image_url;
  }
  if (mobile_image_url !== undefined) {
    if (mobile_image_url !== null && !isStoreImageUrl(mobile_image_url)) {
      return { error: "mobile_image_url tiene que ser una foto subida desde Tienda (o null)" };
    }
    fields.mobile_image_url = mobile_image_url;
  }
  if (kind !== undefined) {
    if (typeof kind !== "string" || !KINDS.includes(kind)) return { error: `kind debe ser uno de: ${KINDS.join(", ")}` };
    fields.kind = kind;
  }
  for (const [name, value, max] of [
    ["alt", alt, 200],
    ["label", label, 80],
    ["title", title, 120],
    ["cta_label", cta_label, 40],
  ] as const) {
    if (value === undefined) continue;
    if (!text(value, max)) return { error: `${name} debe ser texto de hasta ${max} caracteres` };
    fields[name] = name === "alt" ? (clean(value) ?? "") : clean(value);
  }
  if (cta_href !== undefined) {
    const href = clean(cta_href);
    if (href !== null && !(typeof href === "string" && href.length <= 300 && /^(\/|https:\/\/)/.test(href))) {
      return { error: "El link tiene que empezar con / (una página de la tienda) o con https://" };
    }
    fields.cta_href = href;
  }
  if (position !== undefined) {
    const pos = clean(position);
    if (pos !== null && !(typeof pos === "string" && pos.length <= 40 && /^[a-z0-9%. ]+$/i.test(pos))) {
      return { error: "position debe ser como \"center 40%\"" };
    }
    fields.position = pos;
  }
  if (dim !== undefined) {
    if (dim !== null && (typeof dim !== "number" || !Number.isFinite(dim) || dim < 0 || dim > 1)) {
      return { error: "dim debe ser un número entre 0 y 1 (o null)" };
    }
    fields.dim = dim;
  }
  return { fields };
}
