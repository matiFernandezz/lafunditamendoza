// Ruta completa de una categoría para el panel: "Fundas › Diseño",
// "Accesorios › Straps". El nombre del tipo suelto ("Diseño") es ambiguo.

import type { VariantKind } from "@/lib/adminApi";

export const CATEGORY_SEPARATOR = " › ";

type CategoryLike = { id: string; name: string; parent_id: string | null };

type SettingsLike = CategoryLike & { variant_kind: VariantKind | null; by_model: boolean | null };

export type CategorySettings = { kind: VariantKind; byModel: boolean };

/**
 * Configuración efectiva de cada categoría: la propia o, si no la tiene, la de
 * la primera de arriba que sí (igual que category_settings en la base). Sin
 * nada en toda la rama: color y por modelo (como antes de esta configuración).
 */
export function resolveCategorySettings(categories: SettingsLike[]): (id: string) => CategorySettings {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (id) => {
    let kind: VariantKind | null = null;
    let byModel: boolean | null = null;
    for (let c = byId.get(id), hops = 0; c && hops < 10; c = c.parent_id ? byId.get(c.parent_id) : undefined, hops += 1) {
      kind ??= c.variant_kind;
      byModel ??= c.by_model;
    }
    return { kind: kind ?? "color", byModel: byModel ?? true };
  };
}

/**
 * ¿La categoría NO usa colores? Ahí no se ofrecen los controles de colores.
 * Sale de la configuración de la categoría; el servidor lo vuelve a
 * comprobar (category_is_accessory).
 */
export function isAccessoryCategory(categories: SettingsLike[]): (id: string) => boolean {
  const settings = resolveCategorySettings(categories);
  return (id) => settings(id).kind !== "color";
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
