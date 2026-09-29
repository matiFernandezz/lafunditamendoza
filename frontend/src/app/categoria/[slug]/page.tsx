import { notFound } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ModelFilter from "@/components/ModelFilter";
import PageHeader from "@/components/PageHeader";
import ProductGrid from "@/components/ProductGrid";
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
  // Categorías universales (p. ej. cargadores): ningún producto depende del
  // modelo, así que el selector no aporta y no se muestra.
  const dependsOnModel =
    selectedModel !== undefined ||
    products.some((p) => p.product_variants.some((v) => v.iphone_model_id !== null));

  return (
    <div className="space-y-8 md:space-y-10">
      <PageHeader
        parent={category.parent?.name}
        title={category.name}
        count={products.length}
        countSuffix={selectedModel ? `para ${selectedModel.name}` : undefined}
        back={
          category.parent
            ? { href: `/categoria/${category.parent.slug}`, label: category.parent.name }
            : { href: "/", label: "Inicio" }
        }
      />

      {dependsOnModel && (
        <div className="md:max-w-[360px]">
          <ModelFilter models={models} selected={selectedModel?.id ?? ""} />
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState>
          {selectedModel
            ? `No hay productos disponibles para ${selectedModel.name} en esta categoría.`
            : "No hay productos disponibles en esta categoría por el momento."}
        </EmptyState>
      ) : (
        <ProductGrid products={products} modelId={selectedModel?.id} />
      )}
    </div>
  );
}
