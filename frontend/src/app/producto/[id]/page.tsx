import { notFound } from "next/navigation";
import Link from "next/link";
import ProductDetail from "@/components/ProductDetail";
import { categoryHref, getCategoryGroups, getProduct, getProductMotifs, isUuid } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductoPage(props: PageProps<"/producto/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const { modelo, color, motivo } = await props.searchParams;
  const initialModelId = isUuid(modelo) ? modelo : undefined;
  // ?color=<slug>: link compartible a un color puntual.
  const initialColorSlug = typeof color === "string" ? color : undefined;
  const initialMotifSlug = typeof motivo === "string" ? motivo : undefined;

  const [product, groups, motifs] = await Promise.all([getProduct(id), getCategoryGroups(), getProductMotifs(id)]);
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
        motifs={motifs}
        initialModelId={initialModelId}
        initialColorSlug={initialColorSlug}
        initialMotifSlug={initialMotifSlug}
      />
    </div>
  );
}
