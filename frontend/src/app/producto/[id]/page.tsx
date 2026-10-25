import { notFound } from "next/navigation";
import Link from "next/link";
import ProductDetail from "@/components/ProductDetail";
import { categoryHref, getCategoryGroups, getFeaturedProducts, getProduct, isUuid, type Product } from "@/lib/catalog";

/** Cuántos candidatos se le pasan a "Completá tu compra" (después se filtran por modelo y se muestran 4). */
const RELATED_CANDIDATES = 16;

/**
 * Candidatos para "Completá tu compra", en orden: primero lo que complementa (de
 * la otra categoría de tope: accesorios para una funda, fundas para un
 * accesorio), con lo hecho para los mismos modelos adelante; después lo
 * parecido (misma categoría, mismo tipo primero). Solo productos con stock.
 */
function relatedFor(product: Product, pool: Product[]): Product[] {
  const top = (p: Product) => p.category?.parent_id ?? p.category?.id;
  const models = new Set(product.product_variants.map((v) => v.iphone_model_id).filter((id) => id !== null));
  // Primero lo hecho para los mismos modelos (lentes, vidrios), después lo
  // universal (straps, cargadores) y al final lo de otros modelos.
  const fits = (p: Product) =>
    p.product_variants.some((v) => v.iphone_model_id !== null && models.has(v.iphone_model_id))
      ? 0
      : p.product_variants.some((v) => v.iphone_model_id === null)
        ? 1
        : 2;
  const others = pool.filter((p) => p.id !== product.id);
  const complements = others.filter((p) => top(p) !== top(product)).sort((a, b) => fits(a) - fits(b));
  const similar = others
    .filter((p) => top(p) === top(product))
    .sort((a, b) => Number(a.category?.id !== product.category?.id) - Number(b.category?.id !== product.category?.id));
  return [...complements, ...similar].slice(0, RELATED_CANDIDATES);
}

export const dynamic = "force-dynamic";

export default async function ProductoPage(props: PageProps<"/producto/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const { modelo, color, motivo } = await props.searchParams;
  const initialModelId = isUuid(modelo) ? modelo : undefined;
  // ?color=<slug>: link compartible a un color puntual.
  const initialColorSlug = typeof color === "string" ? color : undefined;
  const initialMotifSlug = typeof motivo === "string" ? motivo : undefined;

  const [product, groups, pool] = await Promise.all([getProduct(id), getCategoryGroups(), getFeaturedProducts(80)]);
  if (!product) notFound();

  // Migas: Inicio / Fundas / Diseño / Producto. El tipo lleva al listado de su
  // categoría ya filtrado.
  const group = groups.find((g) => g.id === product.category?.parent_id);
  const crumbs = [
    ...(group ? [{ label: group.name, href: categoryHref(group) }] : []),
    ...(product.category ? [{ label: product.category.name, href: categoryHref(product.category, group) }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-8 md:space-y-10">
      <nav aria-label="Ubicación" className="flex flex-wrap items-center gap-1.5 text-sm text-graphite">
        <Link href="/" className="transition-colors duration-200 hover:text-ink">
          Inicio
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.href} className="contents">
            <span aria-hidden="true">/</span>
            <Link href={crumb.href} className="transition-colors duration-200 hover:text-ink">
              {crumb.label}
            </Link>
          </span>
        ))}
        <span aria-hidden="true">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductDetail
        product={product}
        initialModelId={initialModelId}
        initialColorSlug={initialColorSlug}
        initialMotifSlug={initialMotifSlug}
        related={relatedFor(product, pool)}
      />
    </div>
  );
}
