import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import FilterSelect from "@/components/FilterSelect";
import PageHeader from "@/components/PageHeader";
import ProductGrid from "@/components/ProductGrid";
import { getCategoryGroups, getIphoneModels, getProductsInCategory } from "@/lib/catalog";
import {
  buildListing,
  LEGACY_CATEGORY_SLUGS,
  listingHref,
  SORT_OPTIONS,
  type ListingParams,
} from "@/lib/catalogFilters";

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const CHIP =
  "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-200";
const EMPTY_LINK = "font-medium text-ink underline underline-offset-[3px]";

export default async function CategoryPage(props: PageProps<"/categoria/[slug]">) {
  const { slug: rawSlug } = await props.params;
  const search = await props.searchParams;
  const params: ListingParams = {
    tipo: first(search.tipo),
    modelo: first(search.modelo),
    orden: first(search.orden),
  };

  const slug = LEGACY_CATEGORY_SLUGS[rawSlug] ?? rawSlug;
  const groups = await getCategoryGroups();
  const group = groups.find((g) => g.slug === slug);

  if (!group) {
    // Un tipo (o una URL vieja: /categoria/de-diseno, /categoria/transparentes,
    // /categoria/cargadores-y-cables) no tiene página propia: es un filtro de
    // su categoría. Redirect permanente, conservando modelo y orden.
    const parent = groups.find((g) => g.children.some((c) => c.slug === slug));
    if (!parent) notFound();
    permanentRedirect(listingHref(parent.slug, { ...params, tipo: slug }));
  }

  const [models, allProducts] = await Promise.all([
    getIphoneModels(),
    getProductsInCategory([group.id, ...group.children.map((c) => c.id)]),
  ]);

  const listing = buildListing(group, allProducts, models, params);
  const { type, model, products } = listing;
  const what = (type?.name ?? group.name).toLowerCase();

  return (
    <div className="space-y-8 md:space-y-10">
      <PageHeader
        parent={type ? group.name : undefined}
        title={type?.name ?? group.name}
        count={products.length}
        countSuffix={model ? `para ${model.name}` : undefined}
        back={type ? { href: listing.hrefWith({ tipo: undefined }), label: group.name } : { href: "/", label: "Inicio" }}
      />

      <div className="space-y-6">
        {listing.showModelSelector && (
          <div className="md:max-w-[420px]">
            <FilterSelect
              id="modelo"
              label="Elegí tu iPhone"
              value={model?.slug ?? ""}
              options={[
                { value: "", label: "Todos los modelos", href: listing.hrefWith({ modelo: undefined }) },
                ...listing.modelOptions.map((m) => ({
                  value: m.slug,
                  label: m.name,
                  href: listing.hrefWith({ modelo: m.slug }),
                })),
              ]}
            />
          </div>
        )}

        {(listing.chips.length > 0 || products.length > 1) && (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {listing.chips.length > 0 ? (
              // En mobile los chips se deslizan dentro de su fila (a sangre): la
              // página nunca gana scroll horizontal.
              <nav
                aria-label="Tipo"
                className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
              >
                {listing.chips.map((chip) => (
                  <Link
                    key={chip.slug ?? "todos"}
                    href={chip.href}
                    scroll={false}
                    aria-current={chip.selected ? "true" : undefined}
                    className={`${CHIP} ${
                      chip.selected
                        ? "border-ink bg-ink text-paper"
                        : "border-graphite text-ink hover:border-ink"
                    }`}
                  >
                    {chip.label}
                    <span className={`font-mono text-xs tabular-nums ${chip.selected ? "text-paper/70" : "text-graphite"}`}>
                      {chip.count}
                    </span>
                  </Link>
                ))}
              </nav>
            ) : (
              <span />
            )}

            {products.length > 1 && (
              <FilterSelect
                id="orden"
                label="Ordenar"
                variant="inline"
                value={listing.sort}
                options={SORT_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                  href: listing.hrefWith({ orden: o.value }),
                }))}
              />
            )}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState>
          {model && type ? (
            <>
              No hay {what} para {model.name} por ahora.{" "}
              <Link href={listing.hrefWith({ tipo: undefined })} className={EMPTY_LINK}>
                Ver todo para {model.name}
              </Link>{" "}
              o{" "}
              <Link href={listing.hrefWith({ modelo: undefined })} className={EMPTY_LINK}>
                ver {what} de todos los modelos
              </Link>
              .
            </>
          ) : model ? (
            <>
              No hay {what} para {model.name} por ahora.{" "}
              <Link href={listing.hrefWith({ modelo: undefined })} className={EMPTY_LINK}>
                Ver todos los modelos
              </Link>
              .
            </>
          ) : type ? (
            <>
              No hay {what} en stock por ahora.{" "}
              <Link href={listing.hrefWith({ tipo: undefined })} className={EMPTY_LINK}>
                Ver {group.name.toLowerCase()}
              </Link>
              .
            </>
          ) : (
            "No hay productos disponibles en esta categoría por el momento."
          )}
        </EmptyState>
      ) : (
        <ProductGrid products={products} modelId={model?.id} />
      )}
    </div>
  );
}
