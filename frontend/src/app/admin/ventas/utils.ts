import type { AdminVariant } from "@/lib/adminApi";
import type { DiscountChoice } from "./types";

export const MAX_DISCOUNT_PERCENT = 100;

/** Porcentaje a aplicar, o null si el "Otro" escrito a mano no es válido (1-100). */
export function resolveDiscount(choice: DiscountChoice): number | null {
  if (choice.kind === "none") return 0;
  if (choice.kind === "preset") return choice.percent;
  const n = Number(choice.text);
  return choice.text.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= MAX_DISCOUNT_PERCENT ? n : null;
}

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

/**
 * Pesos que descuenta un porcentaje, redondeados a entero. Es la misma cuenta
 * que hace el backend al registrar la venta (que es el que manda): acá solo
 * sirve para mostrar el total antes de confirmar.
 */
export function discountAmount(subtotal: number, percent: number): number {
  return Math.round((subtotal * percent) / 100);
}

/** "iPhone 13 Pro Max · transparente", o el sku si no hay modelo ni color. */
export function variantLabel(variant: AdminVariant, modelName?: string): string {
  const parts = [modelName, displayColor(variant.color)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : variant.sku;
}
