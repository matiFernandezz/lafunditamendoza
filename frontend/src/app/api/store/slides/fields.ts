import "server-only";
import { isStoreImageUrl } from "@/lib/server/storeContent";

export const SLIDE_SELECT =
  "id, sort_order, image_url, mobile_image_url, alt, kind, label, title, subtitle, cta_label, cta_href, position, position_mobile, dim, text_size, text_position, logo_position";

const KINDS = ["rango", "titulo", "logo", "foto"];
const TEXT_SIZES = ["chico", "mediano", "grande"];
const TEXT_POSITIONS = ["arriba", "centro", "abajo"].flatMap((v) =>
  ["izquierda", "centro", "derecha"].map((h) => `${v}-${h}`),
);

const text = (value: unknown, max: number) => value === null || (typeof value === "string" && value.length <= max);
const clean = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

/**
 * Campos editables de un slide. `partial`: solo los que vienen (PATCH); si no,
 * la foto es obligatoria (alta). Devuelve las columnas limpias o el error.
 */
export function parseSlideFields(
  body: Record<string, unknown>,
  partial: boolean,
): { fields: Record<string, unknown> } | { error: string } {
  const {
    image_url,
    mobile_image_url,
    alt,
    kind,
    label,
    title,
    subtitle,
    cta_label,
    cta_href,
    position,
    position_mobile,
    dim,
    text_size,
    text_position,
    logo_position,
  } = body;
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
    if (typeof kind !== "string" || !KINDS.includes(kind))
      return { error: `kind debe ser uno de: ${KINDS.join(", ")}` };
    fields.kind = kind;
  }
  for (const [name, value, max] of [
    ["alt", alt, 200],
    ["label", label, 80],
    ["title", title, 120],
    ["subtitle", subtitle, 200],
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
  // Encuadre de la foto (object-position), en computadora y en el celular.
  for (const [key, value] of [
    ["position", position],
    ["position_mobile", position_mobile],
  ] as const) {
    if (value === undefined) continue;
    const pos = clean(value);
    if (pos !== null && !(pos.length <= 40 && /^[a-z0-9%. ]+$/i.test(pos))) {
      return { error: `${key} debe ser como "center 40%"` };
    }
    fields[key] = pos;
  }
  if (text_size !== undefined) {
    if (text_size !== null && !(typeof text_size === "string" && TEXT_SIZES.includes(text_size))) {
      return { error: `text_size debe ser uno de: ${TEXT_SIZES.join(", ")} (o null = automático)` };
    }
    fields.text_size = text_size;
  }
  // Dónde van el texto y el logo encima de la foto.
  for (const [key, value] of [
    ["text_position", text_position],
    ["logo_position", logo_position],
  ] as const) {
    if (value === undefined) continue;
    if (value !== null && !(typeof value === "string" && TEXT_POSITIONS.includes(value))) {
      return { error: `${key} debe ser como "abajo-izquierda" (o null)` };
    }
    fields[key] = value;
  }
  if (dim !== undefined) {
    if (dim !== null && (typeof dim !== "number" || !Number.isFinite(dim) || dim < 0 || dim > 1)) {
      return { error: "dim debe ser un número entre 0 y 1 (o null)" };
    }
    fields.dim = dim;
  }
  return { fields };
}
