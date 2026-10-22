import type { NewArrivalItem } from "@/lib/catalog";
import type { NuevoIngreso } from "./NuevosIngresosApilado";

/**
 * Paneles de "Nuevos ingresos" en el orden del panel › Tienda: la foto
 * recortada y el canto vienen de ahí; nombre y precio (el
 * más bajo con stock) salen del producto, así que siempre están al día.
 */
export function buildNuevosIngresos(items: NewArrivalItem[]): NuevoIngreso[] {
  return items.flatMap(({ product, imageUrl, edgeColor }) => {
    if (product.product_variants.length === 0) return [];
    return [
      {
        id: product.id,
        name: product.name,
        price: Math.min(...product.product_variants.map((v) => v.price)),
        href: `/producto/${product.id}`,
        cutoutUrl: imageUrl,
        edgeColor,
      },
    ];
  });
}
