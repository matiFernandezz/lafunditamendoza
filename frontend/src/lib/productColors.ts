// Colores de un producto: qué colores tiene, qué fotos van con cada uno y
// cuáles se pueden elegir para un modelo. Sin React y sin imports de valores:
// lo usan la ficha, las tarjetas y el panel, y `scripts/test-colores.mjs` lo
// importa directo con Node.

export type ColorInfo = { id: string; name: string; slug: string; hex: string; sort_order: number };

type VariantLike = {
  iphone_model_id: string | null;
  stock_quantity: number;
  color_ref: ColorInfo | null;
};

type ImageLike = { id: string; url: string; sort_order: number; color_id: string | null; motif_id?: string | null };

/** Foto general: ni de un color ni de un motivo. */
const isGeneral = (img: { color_id: string | null; motif_id?: string | null }) =>
  img.color_id === null && (img.motif_id ?? null) === null;

/** El selector de círculos aparece solo con esta cantidad de colores o más. */
export const MIN_COLORS_FOR_SELECTOR = 2;
/** Puntitos de color que muestra una tarjeta antes del "+N". */
export const MAX_TILE_DOTS = 5;

/** Colores distintos de las variantes, en el orden de la lista (sort_order y nombre). */
export function productColors(variants: { color_ref: ColorInfo | null }[]): ColorInfo[] {
  const byId = new Map<string, ColorInfo>();
  for (const variant of variants) {
    if (variant.color_ref) byId.set(variant.color_ref.id, variant.color_ref);
  }
  return [...byId.values()].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
}

/** ¿El producto muestra el selector de círculos? */
export function hasColorSelector(colors: ColorInfo[]): boolean {
  return colors.length >= MIN_COLORS_FOR_SELECTOR;
}

/**
 * Fotos a mostrar para un color: las de ese color; si no tiene, las generales
 * (color_id null); si tampoco hay, la primera foto del producto.
 * Sin color elegido (null) van las generales, con la misma caída.
 */
export function imagesForColor<T extends ImageLike>(images: T[], colorId: string | null): T[] {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  if (colorId !== null) {
    const own = sorted.filter((img) => img.color_id === colorId);
    if (own.length > 0) return own;
  }
  const general = sorted.filter(isGeneral);
  if (general.length > 0) return general;
  return sorted.slice(0, 1);
}

// --- motivos -------------------------------------------------------------------
// Un motivo (BATMAN, BOB…) se comporta igual que un color para elegir fotos y
// disponibilidad; lo único distinto es cómo se muestra (una lista, sin círculo).
// Estas funciones reusan las de colores mirando motif_ref / motif_id.

export type MotifInfo = { id: string; name: string; slug: string; sort_order: number };

const asColor = (motif: MotifInfo): ColorInfo => ({ ...motif, hex: "" });

/** Motivos distintos de las variantes, en orden. */
export function productMotifs(variants: { motif_ref: MotifInfo | null }[]): MotifInfo[] {
  return productColors(variants.map((v) => ({ color_ref: v.motif_ref ? asColor(v.motif_ref) : null })));
}

/** Fotos de un motivo; sin fotos propias, las generales; si no, la primera. */
export function imagesForMotif<T extends ImageLike>(images: T[], motifId: string | null): T[] {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  if (motifId !== null) {
    const own = sorted.filter((img) => (img.motif_id ?? null) === motifId);
    if (own.length > 0) return own;
  }
  const general = sorted.filter(isGeneral);
  if (general.length > 0) return general;
  return sorted.slice(0, 1);
}

/** Motivos con stock para un modelo (o para cualquiera, sin modelo elegido). */
export function availableMotifIds(
  variants: { iphone_model_id: string | null; stock_quantity: number; motif_ref: MotifInfo | null }[],
  modelId: string | null,
): Set<string> {
  return availableColorIds(
    variants.map((v) => ({ ...v, color_ref: v.motif_ref ? asColor(v.motif_ref) : null })),
    modelId,
  );
}

/** El motivo que queda elegido: el pedido si hay stock; si no, el primero disponible. */
export function resolveMotif(motifs: MotifInfo[], available: Set<string>, wantedId: string | null): string | null {
  return resolveColor(motifs.map(asColor), available, wantedId);
}

/** Motivo inicial: el de `?motivo=<slug>` si se puede elegir; si no, el primero con stock. */
export function initialMotif(motifs: MotifInfo[], available: Set<string>, slug: string | undefined): string | null {
  return initialColor(motifs.map(asColor), available, slug);
}

/**
 * Colores con stock para un modelo: los de sus variantes y los de las
 * universales (sin modelo). Sin modelo elegido ("" o null), los que tengan
 * stock en cualquier modelo.
 */
export function availableColorIds(variants: VariantLike[], modelId: string | null): Set<string> {
  const ids = new Set<string>();
  for (const variant of variants) {
    if (!variant.color_ref || variant.stock_quantity <= 0) continue;
    if (modelId && variant.iphone_model_id !== null && variant.iphone_model_id !== modelId) continue;
    ids.add(variant.color_ref.id);
  }
  return ids;
}

/**
 * El color que queda elegido: el que se quería si está disponible; si no, el
 * primero disponible (así, al cambiar de modelo, un color sin stock salta
 * solo al primero que sí hay). null si no hay ninguno.
 */
export function resolveColor(colors: ColorInfo[], available: Set<string>, wantedId: string | null): string | null {
  if (wantedId !== null && available.has(wantedId)) return wantedId;
  return colors.find((color) => available.has(color.id))?.id ?? null;
}

/** Color inicial: el de `?color=<slug>` si se puede elegir; si no, el primero con stock. */
export function initialColor(colors: ColorInfo[], available: Set<string>, slug: string | undefined): string | null {
  const fromUrl = slug ? colors.find((color) => color.slug === slug)?.id ?? null : null;
  return resolveColor(colors, available, fromUrl);
}

/** Puntitos de una tarjeta: como mucho MAX_TILE_DOTS y cuántos quedan afuera. */
export function tileDots(colors: ColorInfo[]): { shown: ColorInfo[]; extra: number } {
  if (!hasColorSelector(colors)) return { shown: [], extra: 0 };
  return { shown: colors.slice(0, MAX_TILE_DOTS), extra: Math.max(0, colors.length - MAX_TILE_DOTS) };
}

/** La primera foto propia de un color, o null (para el hover de las tarjetas). */
export function firstImageOfColor(images: ImageLike[], colorId: string): string | null {
  return [...images].sort((a, b) => a.sort_order - b.sort_order).find((img) => img.color_id === colorId)?.url ?? null;
}

/**
 * Panel: colores del producto que no tienen ninguna foto propia. Solo cuenta
 * en productos con selector (2 colores o más): con un solo color la ficha
 * usa las fotos generales y no falta nada.
 */
export function colorsWithoutPhotos(
  variants: { color_id: string | null; active?: boolean }[],
  images: { color_id: string | null }[],
): string[] {
  // Los colores dados de baja no cuentan: no se ven en la tienda.
  const colorIds = [
    ...new Set(variants.filter((v) => v.active !== false).map((v) => v.color_id).filter((id): id is string => id !== null)),
  ];
  if (colorIds.length < MIN_COLORS_FOR_SELECTOR) return [];
  const withPhoto = new Set(images.map((img) => img.color_id));
  return colorIds.filter((id) => !withPhoto.has(id));
}

/** Lo mismo para motivos: "Motivo sin foto". */
export function motifsWithoutPhotos(
  variants: { motif_id: string | null; active?: boolean }[],
  images: { motif_id: string | null }[],
): string[] {
  return colorsWithoutPhotos(
    variants.map((v) => ({ color_id: v.motif_id, active: v.active })),
    images.map((img) => ({ color_id: img.motif_id })),
  );
}

/** Blanco o negro, lo que se lea mejor sobre ese hex (para la raya y el tilde). */
export function contrastOn(hex: string): "#000000" | "#ffffff" {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#000000" : "#ffffff";
}
