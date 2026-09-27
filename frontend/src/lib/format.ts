const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const formatPrice = (value: number) => priceFormatter.format(value);

/**
 * Precio de una card: fijo si todas las variantes visibles cuestan lo mismo
 * (ej. ya filtrado por modelo), o "Desde $X" (el mínimo) si varía.
 */
export function formatPriceRange(prices: number[]): string {
  const unique = new Set(prices);
  const min = Math.min(...prices);
  return unique.size <= 1 ? formatPrice(min) : `Desde ${formatPrice(min)}`;
}
