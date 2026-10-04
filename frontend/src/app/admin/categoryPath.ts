// Ruta completa de una categoría para el panel: "Fundas › Diseño",
// "Accesorios › Straps". El nombre del tipo suelto ("Diseño") es ambiguo.

export const CATEGORY_SEPARATOR = " › ";

type CategoryLike = { id: string; name: string; parent_id: string | null };

export function categoryPathById(categories: CategoryLike[]): (id: string) => string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (id) => {
    const category = byId.get(id);
    if (!category) return "";
    const parent = category.parent_id ? byId.get(category.parent_id) : undefined;
    return parent ? `${parent.name}${CATEGORY_SEPARATOR}${category.name}` : category.name;
  };
}
