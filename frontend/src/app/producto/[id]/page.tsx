import { notFound } from "next/navigation";
import Link from "next/link";
import ArrowMark from "@/components/ArrowMark";
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
      <Link
        href="/"
        className="-my-1 inline-flex min-h-11 items-center gap-2 text-sm text-graphite transition-colors duration-200 hover:text-ink"
      >
        <ArrowMark className="h-2.5 w-4 rotate-180" strokeWidth={5} />
        Inicio
      </Link>

      <ProductDetail product={product} initialModelId={initialModelId} />
    </div>
  );
}
