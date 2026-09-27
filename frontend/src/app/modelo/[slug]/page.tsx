import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowMark from "@/components/ArrowMark";
import ProductTile from "@/components/ProductTile";
import { getIphoneModel, getProductsByModel } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ModeloPage(props: PageProps<"/modelo/[slug]">) {
  const { slug } = await props.params;

  const model = await getIphoneModel(slug);
  if (!model) notFound();

  const products = await getProductsByModel(model.id);

  return (
    <div className="space-y-10 md:space-y-14">
      <div>
        <Link
          href="/"
          className="-my-1 inline-flex min-h-11 items-center gap-2 text-sm text-graphite transition-colors duration-200 hover:text-ink"
        >
          <ArrowMark className="h-2.5 w-4 rotate-180" strokeWidth={5} />
          Inicio
        </Link>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,10vw,4.5rem)] font-black leading-[0.98] tracking-[-0.03em]">
          {model.name}
        </h1>
        <p className="mt-3 text-graphite tabular-nums">
          {products.length === 1 ? "1 producto" : `${products.length} productos`}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="rounded-[28px] border border-dashed border-rule p-8 text-center text-graphite">
          No hay productos disponibles para {model.name} por el momento.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
          {products.map((product) => (
            <ProductTile key={product.id} product={product} modelId={model.id} />
          ))}
        </div>
      )}
    </div>
  );
}
