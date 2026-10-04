// Ruta completa de una categoría para el panel: "Fundas › Diseño",
// "Accesorios › Straps". El nombre del tipo suelto ("Diseño") es ambiguo.

export const CATEGORY_SEPARATOR = " › ";

type CategoryLike = { id: string; name: string; parent_id: string | null };

/** Slug de la categoría de tope donde los colores por modelo no aplican. */
export const ACCESSORIES_SLUG = "accesorios";

/**
 * ¿La categoría es Accesorios o cuelga de Accesorios? Ahí la variante no es
 * un color por modelo (un cable "tipo C a C") y no se ofrecen los controles
 * de colores. El servidor lo vuelve a comprobar (category_is_accessory).
 */
export function isAccessoryCategory(categories: (CategoryLike & { slug: string })[]): (id: string) => boolean {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (id) => {
    for (let c = byId.get(id), hops = 0; c && hops < 10; c = c.parent_id ? byId.get(c.parent_id) : undefined, hops += 1) {
      if (c.slug === ACCESSORIES_SLUG) return true;
    }
    return false;
  };
}

/** La categoría y todos sus tipos (ids). */
export function categorySubtree(categories: CategoryLike[], id: string): Set<string> {
  const ids = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const c of categories) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function categoryPathById(categories: CategoryLike[]): (id: string) => string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (id) => {
    const category = byId.get(id);
    if (!category) return "";
    const parent = category.parent_id ? byId.get(category.parent_id) : undefined;
    return parent ? `${parent.name}${CATEGORY_SEPARATOR}${category.name}` : category.name;
  };
}
