import Link from "next/link";
import { notFound } from "next/navigation";
import ModelFilter from "@/components/ModelFilter";
import ProductCard from "@/components/ProductCard";
import {
  getCategory,
  getIphoneModels,
  getProductsByCategory,
  isUuid,
} from "@/lib/catalog";

export default async function CategoryPage(props: PageProps<"/categoria/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  // Un ?modelo= inválido se ignora en vez de romper la página.
  const { modelo } = await props.searchParams;
  const modelId = isUuid(modelo) ? modelo : undefined;

  const [category, models, products] = await Promise.all([
    getCategory(id),
    getIphoneModels(),
    getProductsByCategory(id, modelId),
  ]);
  if (!category) notFound();

  const selectedModel = models.find((m) => m.id === modelId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-zinc-500">
          ← Inicio
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {category.parent && (
            <span className="block text-sm font-medium text-zinc-500">
              {category.parent.name}
            </span>
          )}
          {category.name}
        </h1>
      </div>

      <ModelFilter models={models} selected={selectedModel?.id ?? ""} />

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
          {selectedModel
            ? `No hay productos disponibles para ${selectedModel.name} en esta categoría.`
            : "No hay productos disponibles en esta categoría por el momento."}
        </p>
      ) : (
        <ul className="space-y-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      )}
    </div>
  );
}
