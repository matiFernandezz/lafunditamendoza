// Reglas de la ventana "Agregar variante": qué se le pregunta a cada producto.
// Sin React ni imports de valores: lo prueba un script directo con Node.

type VariantLike = {
  iphone_model_id: string | null;
  color: string | null;
  color_id: string | null;
  motif_id: string | null;
  price: number;
  stock_quantity: number;
};

/** A qué va la variante: a un modelo de iPhone, o sirve para todos. */
export type Target = "iphone" | "universal";
/** Qué distingue a la variante dentro del producto. */
export type AttributeKind = "color" | "motif" | "text";

export type VariantRules = {
  /** El producto ya define si va por modelo o es universal; null = hay que preguntarlo. */
  fixedTarget: Target | null;
  /** Color (fundas), Motivo (productos con motivos) o Descripción libre. */
  kind: AttributeKind;
  /**
   * El producto tiene variantes pero ninguna con color ni motivo: el primer
   * color o motivo que se agregue se les asigna a todas, sin crear nada.
   */
  firstAttribute: { variants: number; units: number } | null;
};

const hasText = (v: VariantLike) => {
  const text = v.color?.trim().toLowerCase() ?? "";
  return text !== "" && text !== "único" && text !== "unico";
};

/**
 * - Una funda (sus variantes tienen modelo) siempre es "Un iPhone"; un producto
 *   sin modelos (protector de cargador, cable) siempre es "Universal". Solo se
 *   pregunta si todavía no tiene variantes.
 * - El atributo: Motivo si el producto usa motivos; Color si usa colores o es
 *   una funda; Descripción libre en Accesorios sin motivos y en productos cuyas
 *   variantes ya se distinguen por una descripción.
 */
export function variantRules(variants: VariantLike[], accessory: boolean): VariantRules {
  const usesMotifs = variants.some((v) => v.motif_id !== null);
  const usesColors = variants.some((v) => v.color_id !== null);
  const usesText = !usesMotifs && !usesColors && variants.some(hasText);

  const fixedTarget: Target | null =
    variants.length === 0 ? null : variants.some((v) => v.iphone_model_id !== null) ? "iphone" : "universal";

  const kind: AttributeKind = usesMotifs ? "motif" : usesColors ? "color" : usesText || accessory ? "text" : "color";

  const firstAttribute =
    kind !== "text" && variants.length > 0 && !usesMotifs && !usesColors
      ? { variants: variants.length, units: variants.reduce((sum, v) => sum + v.stock_quantity, 0) }
      : null;

  return { fixedTarget, kind, firstAttribute };
}

/**
 * Precio con el que arranca el campo: el de otra variante del mismo modelo (si
 * se eligió uno solo y el producto la tiene) o, si no, el más frecuente del
 * producto (entre empatados, el más alto). null si el producto no tiene variantes.
 */
export function suggestedPrice(variants: VariantLike[], modelIds: (string | null)[]): number | null {
  if (variants.length === 0) return null;
  if (modelIds.length === 1) {
    const same = variants.filter((v) => v.iphone_model_id === modelIds[0]);
    if (same.length > 0) return Math.max(...same.map((v) => v.price));
  }
  const counts = new Map<number, number>();
  for (const v of variants) counts.set(v.price, (counts.get(v.price) ?? 0) + 1);
  let best = variants[0].price;
  for (const [price, count] of counts) {
    const bestCount = counts.get(best) ?? 0;
    if (count > bestCount || (count === bestCount && price > best)) best = price;
  }
  return best;
}

/**
 * Qué falta para poder agregar (lo que se muestra junto al botón deshabilitado),
 * o null si está todo.
 */
export function missingToAdd(form: {
  productChosen: boolean;
  target: Target | null;
  modelCount: number;
  kind: AttributeKind;
  attributeChosen: boolean;
  usesAttribute: boolean;
  stock: string;
  price: string;
}): string | null {
  if (!form.productChosen) return "Elegí el producto.";
  if (form.target === null) return "Elegí si es para un iPhone o universal.";
  if (form.target === "iphone" && form.modelCount === 0) return "Elegí al menos un modelo.";
  // En un producto que ya usa colores o motivos, toda variante lleva el suyo.
  if (form.usesAttribute && !form.attributeChosen) return form.kind === "motif" ? "Elegí el motivo." : "Elegí el color.";
  const stock = form.stock.trim() === "" ? 0 : Number(form.stock);
  if (!Number.isInteger(stock) || stock < 0) return "El stock tiene que ser un entero mayor o igual a 0.";
  const price = Number(form.price);
  if (form.price.trim() === "" || !Number.isFinite(price) || price <= 0) return "Poné el precio (mayor a 0).";
  return null;
}
