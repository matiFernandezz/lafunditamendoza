import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowMark from "@/components/ArrowMark";
import ModelFilter from "@/components/ModelFilter";
import ProductTile from "@/components/ProductTile";
import { getCategory, getIphoneModels, getProductsByCategory, isUuid } from "@/lib/catalog";

export default async function CategoryPage(props: PageProps<"/categoria/[slug]">) {
  const { slug } = await props.params;

  // Un ?modelo= inválido se ignora en vez de romper la página.
  const { modelo } = await props.searchParams;
  const modelId = isUuid(modelo) ? modelo : undefined;

  const category = await getCategory(slug);
  if (!category) notFound();

  const [models, products] = await Promise.all([
    getIphoneModels(),
    getProductsByCategory(category.id, modelId),
  ]);

  const selectedModel = models.find((m) => m.id === modelId);

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
          {category.parent && <span className="text-graphite">{category.parent.name} / </span>}
          {category.name}
        </h1>
        <p className="mt-3 text-graphite tabular-nums">
          {products.length === 1 ? "1 producto" : `${products.length} productos`}
          {selectedModel && <span> para {selectedModel.name}</span>}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[17rem_1fr] md:items-start md:gap-12">
        <div className="md:sticky md:top-20">
          <ModelFilter models={models} selected={selectedModel?.id ?? ""} />
        </div>

        {products.length === 0 ? (
          <p className="rounded-[28px] border border-dashed border-rule p-8 text-center text-graphite">
            {selectedModel
              ? `No hay productos disponibles para ${selectedModel.name} en esta categoría.`
              : "No hay productos disponibles en esta categoría por el momento."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
            {products.map((product) => (
              <ProductTile key={product.id} product={product} modelId={selectedModel?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
