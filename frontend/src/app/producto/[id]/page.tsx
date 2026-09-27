import { notFound } from "next/navigation";
import Link from "next/link";
import ProductDetail from "@/components/ProductDetail";
import { getProduct, isUuid } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductoPage(props: PageProps<"/producto/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const { modelo } = await props.searchParams;
  const initialModelId = isUuid(modelo) ? modelo : undefined;

  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="space-y-8 md:space-y-10">
      <nav aria-label="Ubicación" className="flex flex-wrap items-center gap-1.5 text-sm text-graphite">
        <Link href="/" className="transition-colors duration-200 hover:text-ink">
          Inicio
        </Link>
        {product.category && (
          <>
            <span aria-hidden="true">/</span>
            <Link
              href={`/categoria/${product.category.slug}`}
              className="transition-colors duration-200 hover:text-ink"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductDetail product={product} initialModelId={initialModelId} />
    </div>
  );
}
