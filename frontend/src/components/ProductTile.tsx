import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { formatPriceRange } from "@/lib/format";

// Una card por producto/diseño, nunca una por combinación modelo/color:
// el precio es fijo si todas las variantes visibles cuestan lo mismo
// (ej. ya filtrado por modelo), o "Desde $X" si varía entre modelos.
export default function ProductTile({
  product,
  modelId,
}: {
  product: Product;
  modelId?: string;
}) {
  const price = formatPriceRange(product.product_variants.map((v) => v.price));
  const href = modelId ? `/producto/${product.id}?modelo=${modelId}` : `/producto/${product.id}`;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[20px] border border-rule transition-colors duration-200 hover:border-ink"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-rule/40">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-graphite">
            Sin foto
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="font-display text-base font-bold leading-tight tracking-tight text-pretty">
          {product.name}
        </p>
        <p className="font-mono text-sm tabular-nums text-graphite">{price}</p>
      </div>
    </Link>
  );
}
