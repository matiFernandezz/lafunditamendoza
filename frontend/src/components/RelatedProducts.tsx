import type { Product } from "@/lib/catalog";
import HomeSectionTitle from "./home/HomeSectionTitle";
import ProductTile from "./ProductTile";

const MAX = 4;

/**
 * "Completá tu compra", al pie de la ficha: hasta 4 productos, en el orden que
 * arma la página (primero lo que complementa, después lo parecido). Con un
 * modelo elegido, solo lo que hay para ese iPhone (o sirve para todos).
 */
export default function RelatedProducts({ products, modelId }: { products: Product[]; modelId: string | null }) {
  const shown = (
    modelId
      ? products.filter((p) => p.product_variants.some((v) => v.iphone_model_id === modelId || v.iphone_model_id === null))
      : products
  ).slice(0, MAX);

  if (shown.length === 0) return null;

  return (
    <section aria-label="Completá tu compra" className="space-y-5 lg:space-y-7">
      <HomeSectionTitle>Completá tu compra</HomeSectionTitle>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-4">
        {shown.map((product) => (
          <ProductTile key={product.id} product={product} modelId={modelId ?? undefined} />
        ))}
      </div>
    </section>
  );
}
