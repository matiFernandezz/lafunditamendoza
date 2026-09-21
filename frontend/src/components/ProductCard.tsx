import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

const LOW_STOCK = 3;

export default function ProductCard({ product }: { product: Product }) {
  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h3 className="text-base font-semibold">{product.name}</h3>
      {product.description && (
        <p className="mt-1 text-sm text-zinc-600">{product.description}</p>
      )}
      <ul className="mt-3 divide-y divide-zinc-100">
        {product.product_variants.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium capitalize">
                {v.iphone_models?.name ?? "Todos los modelos"}
              </p>
              <p className="text-xs text-zinc-500">
                {v.color && <span className="capitalize">{v.color}</span>}
                {v.color && v.stock_quantity <= LOW_STOCK && " · "}
                {v.stock_quantity <= LOW_STOCK && (
                  <span className="font-medium text-amber-700">
                    {v.stock_quantity === 1 ? "Última unidad" : `Quedan ${v.stock_quantity}`}
                  </span>
                )}
              </p>
            </div>
            <p className="shrink-0 text-base font-semibold">{formatPrice(v.price)}</p>
          </li>
        ))}
      </ul>
    </li>
  );
}
