import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

const LOW_STOCK = 3;

// Ficha técnica: contenedor con el radio de un iPhone (28px), variantes como filas
// separadas por reglas (sin paneles anidados), precio y SKU en mono.
export default function ProductCard({ product }: { product: Product }) {
  return (
    <li className="rounded-[28px] border border-rule p-5 sm:p-6">
      <h3 className="font-display text-xl font-semibold leading-tight tracking-tight">
        {product.name}
      </h3>
      {product.description && (
        <p className="mt-1.5 text-[15px] leading-snug text-graphite text-pretty">
          {product.description}
        </p>
      )}
      <ul className="mt-4 divide-y divide-rule">
        {product.product_variants.map((v) => {
          const low = v.stock_quantity <= LOW_STOCK;
          return (
            <li key={v.id} className="flex items-baseline justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{v.iphone_models?.name ?? "Todos los modelos"}</p>
                <p className="mt-0.5 text-sm text-graphite">
                  {v.color && <span className="capitalize">{v.color}</span>}
                  {v.color && <span aria-hidden="true"> · </span>}
                  <span className="whitespace-nowrap font-mono text-xs">{v.sku}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-base font-medium tabular-nums">
                  {formatPrice(v.price)}
                </p>
                {low && (
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-ink" />
                    {v.stock_quantity === 1 ? "Última unidad" : `Quedan ${v.stock_quantity}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
