import type { Category, CategoryGroup, IphoneModel, Product } from "./catalog";
import { isUuid } from "./catalog";

// Filtros de las páginas de categoría (Fundas, Accesorios). El estado vive en
// la URL para poder compartirla:
//   /categoria/fundas?modelo=<slug>&tipo=<slug>&orden=<valor>
// Todo es lógica pura sobre los productos ya traídos (con stock), sin consultas.

/** Slugs que ya se compartieron por WhatsApp y cambiaron de nombre. */
export const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  "de-diseno": "diseno",
  "de-silicona": "silicona",
};

export const SORT_OPTIONS = [
  { value: "nuevos", label: "Más nuevos" },
  { value: "menor-precio", label: "Menor precio" },
  { value: "mayor-precio", label: "Mayor precio" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
const DEFAULT_SORT: SortValue = "nuevos";

export type ListingParams = { tipo?: string; modelo?: string; orden?: string };

/** URL de un listado; no escribe los valores por defecto. */
export function listingHref(groupSlug: string, params: ListingParams): string {
  const query = new URLSearchParams();
  if (params.modelo) query.set("modelo", params.modelo);
  if (params.tipo) query.set("tipo", params.tipo);
  if (params.orden && params.orden !== DEFAULT_SORT) query.set("orden", params.orden);
  const qs = query.toString();
  return `/categoria/${groupSlug}${qs ? `?${qs}` : ""}`;
}

/** ¿Algún producto tiene variantes atadas a un modelo de iPhone? */
function dependsOnModel(products: Product[]): boolean {
  return products.some((p) => p.product_variants.some((v) => v.iphone_model_id !== null));
}

/** Deja las variantes del modelo (o universales) y saca los productos que quedan sin ninguna. */
function filterByModel(products: Product[], modelId: string): Product[] {
  return products
    .map((p) => ({
      ...p,
      product_variants: p.product_variants.filter(
        (v) => v.iphone_model_id === modelId || v.iphone_model_id === null,
      ),
    }))
    .filter((p) => p.product_variants.length > 0);
}

const minPrice = (p: Product) => Math.min(...p.product_variants.map((v) => v.price));

function sortProducts(products: Product[], sort: SortValue): Product[] {
  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, "es");
  const sorted = [...products];
  if (sort === "menor-precio") sorted.sort((a, b) => minPrice(a) - minPrice(b) || byName(a, b));
  else if (sort === "mayor-precio") sorted.sort((a, b) => minPrice(b) - minPrice(a) || byName(a, b));
  else sorted.sort((a, b) => b.created_at.localeCompare(a.created_at) || byName(a, b));
  return sorted;
}

export type TypeChip = { slug: string | null; label: string; count: number; selected: boolean; href: string };

export type Listing = {
  /** Tipo elegido (chip), o null = todos. */
  type: Category | null;
  /** Modelo que se está aplicando, o null. */
  model: IphoneModel | null;
  /** Si corresponde mostrar "Elegí tu iPhone" en esta vista. */
  showModelSelector: boolean;
  /** Modelos que tienen algo en esta vista (más el elegido). */
  modelOptions: IphoneModel[];
  chips: TypeChip[];
  sort: SortValue;
  products: Product[];
  /** URL de esta misma vista cambiando algún filtro. */
  hrefWith: (changes: ListingParams) => string;
};

export function buildListing(
  group: CategoryGroup,
  allProducts: Product[],
  models: IphoneModel[],
  params: ListingParams,
): Listing {
  const type = group.children.find((c) => c.slug === params.tipo) ?? null;
  const sort = SORT_OPTIONS.some((o) => o.value === params.orden) ? (params.orden as SortValue) : DEFAULT_SORT;

  const ofType = (products: Product[], typeId: string | null) =>
    typeId ? products.filter((p) => p.category?.id === typeId) : products;

  // El modelo aplica si el tipo elegido es "por modelo" (fundas, lentes de
  // cámara…). Sin tipo elegido, solo si TODOS los tipos lo son (Fundas sí,
  // Accesorios no: mezcla straps y soportes con lentes).
  const categoryIds = [...new Set(allProducts.map((p) => p.category?.id ?? ""))];
  const modelApplies = (typeId: string | null) =>
    typeId
      ? dependsOnModel(ofType(allProducts, typeId))
      : categoryIds.length > 0 && categoryIds.every((id) => dependsOnModel(ofType(allProducts, id)));

  // ?modelo acepta el slug (lo nuevo) o el uuid (links viejos).
  const requested = params.modelo
    ? (models.find((m) => (isUuid(params.modelo) ? m.id === params.modelo : m.slug === params.modelo)) ?? null)
    : null;
  const showModelSelector = modelApplies(type?.id ?? null);
  const model = showModelSelector ? requested : null;

  const base = model ? filterByModel(allProducts, model.id) : allProducts;
  const products = sortProducts(ofType(base, type?.id ?? null), sort);

  const scope = ofType(allProducts, type?.id ?? null);
  const modelOptions = models.filter((m) => m.id === model?.id || filterByModel(scope, m.id).length > 0);

  const hrefFor = (next: { type: Category | null; modelo?: string; orden?: string }) =>
    listingHref(group.slug, {
      tipo: next.type?.slug,
      // El modelo solo viaja a las vistas donde se usa.
      modelo: modelApplies(next.type?.id ?? null) ? next.modelo : undefined,
      orden: next.orden,
    });

  // Chips: solo tipos con productos para el modelo elegido (más el elegido,
  // aunque esté en 0, para que se entienda dónde se está). Con un solo tipo
  // con productos no hay nada que filtrar: no se muestran.
  const typesWithProducts = group.children.filter((c) => ofType(allProducts, c.id).length > 0);
  const chips: TypeChip[] =
    typesWithProducts.length < 2
      ? []
      : [
          {
            slug: null,
            label: group.name.toLowerCase().endsWith("as") ? "Todas" : "Todos",
            count: base.length,
            selected: type === null,
            href: hrefFor({ type: null, modelo: requested?.slug, orden: sort }),
          },
          ...group.children
            .map((c) => ({
              slug: c.slug,
              label: c.name,
              count: ofType(base, c.id).length,
              selected: c.id === type?.id,
              href: hrefFor({ type: c, modelo: requested?.slug, orden: sort }),
            }))
            .filter((chip) => chip.count > 0 || chip.selected),
        ];

  return {
    type,
    model,
    showModelSelector,
    modelOptions,
    chips,
    sort,
    products,
    hrefWith: (changes) =>
      hrefFor({
        type: "tipo" in changes ? (group.children.find((c) => c.slug === changes.tipo) ?? null) : type,
        modelo: "modelo" in changes ? changes.modelo : model?.slug,
        orden: "orden" in changes ? changes.orden : sort,
      }),
  };
}
