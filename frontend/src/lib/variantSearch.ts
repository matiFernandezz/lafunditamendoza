// Búsqueda dentro de una lista de variantes (Catálogo y Compras) y de modelos.
// Sin React ni imports: la prueba un script directo con Node.

/** Cómo se muestra una variante sin modelo de iPhone en todo el panel. */
export const UNIVERSAL_LABEL = "Universal";

/** Minúsculas y sin tildes, para comparar. */
export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Las palabras de una búsqueda, ya normalizadas. */
export function searchTokens(query: string): string[] {
  return foldText(query).split(/\s+/).filter(Boolean);
}

/**
 * ¿El texto cumple con TODAS las palabras buscadas? Ignora mayúsculas y
 * tildes. "16 pro azul" encuentra "iPhone 16 Pro Max · Azul"; "iphone 16"
 * trae iPhone 16, 16 Plus, 16 Pro y 16 Pro Max.
 */
export function matchesSearch(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const folded = foldText(haystack);
  return tokens.every((token) => folded.includes(token));
}

/** Texto donde se busca una variante: modelo, color / motivo / descripción y SKU. */
export function variantHaystack(modelName: string | null | undefined, label: string | null | undefined, sku: string): string {
  return [modelName ?? UNIVERSAL_LABEL, label ?? "", sku].join(" ");
}

/** Filtra una lista con la búsqueda escrita. Con la búsqueda vacía devuelve todo. */
export function filterBySearch<T>(items: T[], query: string, haystack: (item: T) => string): T[] {
  const tokens = searchTokens(query);
  return tokens.length === 0 ? items : items.filter((item) => matchesSearch(haystack(item), tokens));
}
