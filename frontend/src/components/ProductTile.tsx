import Image from "next/image";
import Link from "next/link";
import { coverImage, type Product } from "@/lib/catalog";
import { formatPriceRange } from "@/lib/format";

// Una card por producto/diseño, nunca una por combinación modelo/color:
// el precio es fijo si todas las variantes visibles cuestan lo mismo
// (ej. ya filtrado por modelo), o "Desde $X" si varía entre modelos.
// Solo muestra la portada (primera imagen); la galería completa es del detalle.
// Piel del diseño: foto en rectángulo simple 4/5, sin caja ni borde; nombre en
// Space Grotesk y precio en mono debajo.
export default function ProductTile({
  product,
  modelId,
}: {
  product: Product;
  modelId?: string;
}) {
  const price = formatPriceRange(product.product_variants.map((v) => v.price));
  const href = modelId ? `/producto/${product.id}?modelo=${modelId}` : `/producto/${product.id}`;
  const image = coverImage(product);

  return (
    <Link href={href} className="group block text-ink">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-rule/40">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            quality={90}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-graphite">Sin foto</div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 pt-3">
        <p className="font-display text-card font-semibold leading-heading tracking-tight underline-offset-[3px] group-hover:underline">
          {product.name}
        </p>
        <p className="font-mono text-sm tabular-nums text-graphite">{price}</p>
      </div>
    </Link>
  );
}
