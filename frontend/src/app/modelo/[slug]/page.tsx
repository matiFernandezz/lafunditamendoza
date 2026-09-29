import { notFound } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import ProductGrid from "@/components/ProductGrid";
import { getIphoneModel, getProductsByModel } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ModeloPage(props: PageProps<"/modelo/[slug]">) {
  const { slug } = await props.params;

  const model = await getIphoneModel(slug);
  if (!model) notFound();

  const products = await getProductsByModel(model.id);

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
