import type { Product } from "@/lib/catalog";
import ProductTile from "./ProductTile";

/**
 * Grilla de productos de los listados (categoría y modelo). Más columnas
 * que las 4 del diseño (hasta 5 en desktop, 6 en pantallas muy anchas) para
 * que las fotos no queden enormes a todo el ancho.
 */
export default function ProductGrid({ products, modelId }: { products: Product[]; modelId?: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:gap-x-4 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {products.map((product) => (
        <ProductTile key={product.id} product={product} modelId={modelId} />
      ))}
    </div>
  );
}
