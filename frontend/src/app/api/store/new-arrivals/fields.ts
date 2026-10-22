import "server-only";
import { isStoreImageUrl } from "@/lib/server/storeContent";

export const ARRIVAL_SELECT = `id, sort_order, image_url, edge_color, product_id,
  product:products ( id, name, active, product_variants ( price, stock_quantity, active ) )`;

const HEX = /^#[0-9a-f]{6}$/;

/** Foto recortada y color de canto. `partial`: solo los que vienen (PATCH). */
export function parseArrivalFields(
  body: Record<string, unknown>,
  partial: boolean,
): { fields: Record<string, unknown> } | { error: string } {
  const { image_url, edge_color } = body;
  const fields: Record<string, unknown> = {};
  if (image_url !== undefined || !partial) {
    if (!isStoreImageUrl(image_url)) return { error: "image_url tiene que ser una foto subida desde Tienda" };
    fields.image_url = image_url;
  }
  if (edge_color !== undefined) {
    const hex = typeof edge_color === "string" ? edge_color.toLowerCase() : "";
    if (!HEX.test(hex)) return { error: "edge_color debe ser un color como #121212" };
    fields.edge_color = hex;
  }
  return { fields };
}

type ProductStock = { product_variants: { price: number; stock_quantity: number; active: boolean }[] } | null;

/**
 * Precio más bajo y unidades con stock, para mostrar en el panel. (Sin tipos
 * generados, supabase-js tipa el producto como lista; llega como objeto.)
 */
export function withStock<T extends { product: unknown }>(row: T) {
  const product = row.product as ProductStock;
  const variants = (product?.product_variants ?? []).filter((v) => v.active);
  const inStock = variants.filter((v) => v.stock_quantity > 0);
  return {
    ...row,
    price: inStock.length > 0 ? Math.min(...inStock.map((v) => Number(v.price))) : null,
    units: inStock.reduce((sum, v) => sum + v.stock_quantity, 0),
  };
}
