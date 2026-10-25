import { notFound } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import ProductGrid from "@/components/ProductGrid";
import { getCategoryGroups, getIphoneModel, getProductsByModel } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ModeloPage(props: PageProps<"/modelo/[slug]">) {
  const { slug } = await props.params;

  const model = await getIphoneModel(slug);
  if (!model) notFound();

  const [found, groups] = await Promise.all([getProductsByModel(model.id), getCategoryGroups()]);

  // Primero las fundas y los accesorios al final: en el orden de las categorías
  // de tope (el del menú); adentro de cada una, por nombre (como vienen).
  const groupIndex = new Map<string, number>();
  groups.forEach((g, i) => {
    groupIndex.set(g.id, i);
    g.children.forEach((c) => groupIndex.set(c.id, i));
  });
  const position = (categoryId: string | undefined) => (categoryId ? groupIndex.get(categoryId) : undefined) ?? groups.length;
  const products = [...found].sort((a, b) => position(a.category?.id) - position(b.category?.id));

  return (
    <div className="space-y-8 md:space-y-10">
      <PageHeader title={model.name} count={products.length} back={{ href: "/", label: "Inicio" }} />

      {products.length === 0 ? (
        <EmptyState>No hay productos disponibles para {model.name} por el momento.</EmptyState>
      ) : (
        <ProductGrid products={products} modelId={model.id} />
      )}
    </div>
  );
}
