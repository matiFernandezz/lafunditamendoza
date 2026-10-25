import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ModelPicker from "@/components/ModelPicker";
import PageHeader from "@/components/PageHeader";
import ProductGrid from "@/components/ProductGrid";
import SortPicker from "@/components/SortPicker";
import TypePicker from "@/components/TypePicker";
import { getCategoryGroups, getIphoneModels, getProductsInCategory, groupModelsByLine } from "@/lib/catalog";
import {
  buildListing,
  LEGACY_CATEGORY_SLUGS,
  listingHref,
  SORT_OPTIONS,
  type ListingParams,
} from "@/lib/catalogFilters";

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const EMPTY_LINK = "font-medium text-ink underline underline-offset-[3px]";

export default async function CategoryPage(props: PageProps<"/categoria/[slug]">) {
  const { slug: rawSlug } = await props.params;
  const search = await props.searchParams;
  const params: ListingParams = {
    tipo: first(search.tipo),
    modelo: first(search.modelo),
    orden: first(search.orden),
    desde: first(search.desde),
    hasta: first(search.hasta),
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
  const hasPrice = listing.price.desde !== undefined || listing.price.hasta !== undefined;

  return (
    <div className="space-y-8 md:space-y-10">
      <div>
        <PageHeader
          parent={type ? group.name : undefined}
          title={type?.name ?? group.name}
          back={
            type ? { href: listing.hrefWith({ tipo: undefined }), label: group.name } : { href: "/", label: "Inicio" }
          }
        />

        {/* Debajo de la línea del encabezado: tipo (Accesorios) y modelo a la izquierda,
            el orden a la derecha. */}
        {(listing.showTypePicker || listing.showModelSelector || products.length > 1 || hasPrice) && (
          // En mobile, una píldora debajo de la otra contra el margen (los popups abren hacia la derecha).
          <div className="mt-5 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="flex flex-col items-start gap-3 md:flex-row md:flex-wrap md:items-center">
              {listing.showTypePicker && (
                <TypePicker chips={listing.chips} allLabel={`Todos los ${group.name.toLowerCase()}`} />
              )}
              {listing.showModelSelector && (
                <ModelPicker
                  selected={model ? { slug: model.slug, name: model.name } : null}
                  allHref={listing.hrefWith({ modelo: undefined })}
                  // Todos los modelos (también los que no tienen nada acá, atenuados):
                  // así la línea entera, del 11 al 18, siempre está.
                  lines={groupModelsByLine(models).map((line) => ({
                    key: line.key,
                    models: line.models.map((m) => ({
                      slug: m.slug,
                      name: m.name,
                      href: listing.hrefWith({ modelo: m.slug }),
                      available: listing.modelOptions.some((o) => o.id === m.id),
                    })),
                  }))}
                />
              )}
            </div>
            {/* Con un rango de precio puesto queda aunque no haya resultados, para poder sacarlo. */}
            {(products.length > 1 || hasPrice) && (
              <SortPicker
                sort={listing.sort}
                price={listing.price}
                priceHref={listing.hrefWith({ desde: undefined, hasta: undefined })}
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
          {hasPrice ? (
            <>
              No hay {what} en ese rango de precio.{" "}
              <Link href={listing.hrefWith({ desde: undefined, hasta: undefined })} className={EMPTY_LINK}>
                Ver todos los precios
              </Link>
              .
            </>
          ) : model && type ? (
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
