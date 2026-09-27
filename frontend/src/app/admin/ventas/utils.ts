import type { AdminVariant } from "@/lib/adminApi";

/**
 * Color a mostrar, o null si no hay nada que mostrar. "Único" es el valor
 * que traen los productos de un solo color desde la importación: no aporta
 * nada, así que se omite igual que un color vacío (sin dejar un "·" suelto).
 */
export function displayColor(color: string | null): string | null {
  const trimmed = color?.trim();
  if (!trimmed) return null;
  return trimmed.toLocaleLowerCase("es") === "único" ? null : trimmed;
}

/** "iPhone 13 Pro Max · transparente", o el sku si no hay modelo ni color. */
export function variantLabel(variant: AdminVariant, modelName?: string): string {
  const parts = [modelName, displayColor(variant.color)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : variant.sku;
}
