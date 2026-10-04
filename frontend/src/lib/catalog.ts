import { supabase } from "./supabase";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

export type CategoryGroup = Category & { children: Category[] };

export type IphoneModel = {
  id: string;
  name: string;
  slug: string;
};

export type Variant = {
  id: string;
  sku: string;
  color: string | null;
  price: number;
  stock_quantity: number;
  iphone_model_id: string | null;
  iphone_models: { name: string } | null;
};

export type ProductImage = {
  id: string;
  url: string;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: { id: string; name: string; slug: string; parent_id: string | null } | null;
  created_at: string;
  product_images: ProductImage[];
  product_variants: Variant[];
};

/** La portada de un producto: su primera imagen (sort_order más bajo), o null si no tiene ninguna. */
export function coverImage(product: Pick<Product, "product_images">): string | null {
  return product.product_images[0]?.url ?? null;
}

const PRODUCT_SELECT =
  "id, name, description, created_at, category:categories(id, name, slug, parent_id), product_images(id, url, sort_order), product_variants!inner(id, sku, color, price, stock_quantity, iphone_model_id, iphone_models(name))";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

/**
 * Categorías de tope (las del menú: Fundas, Accesorios) con sus tipos, en el
 * orden de sort_order.
 */
export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("sort_order")
    .order("name")
    .overrideTypes<Category[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);

  return data
    .filter((c) => c.parent_id === null)
    .map((parent) => ({
      ...parent,
      children: data.filter((c) => c.parent_id === parent.id),
    }));
}

/** Una categoría (por slug, para la URL /categoria/[slug]) con el nombre de su padre. */
export async function getCategory(
  slug: string,
): Promise<(Category & { parent: { id: string; name: string; slug: string } | null }) | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<Category, { merge: false }>();
  if (error) throw new Error(`No se pudo cargar la categoría: ${error.message}`);
  if (!data) return null;

  // Consulta aparte: el embed `categories!parent_id` sobre la misma tabla resuelve
  // hacia los hijos y devuelve [], así que el nombre del padre nunca llegaba.
  let parent: { id: string; name: string; slug: string } | null = null;
  if (data.parent_id) {
    const { data: parentRow, error: parentError } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("id", data.parent_id)
      .maybeSingle()
      .overrideTypes<{ id: string; name: string; slug: string }, { merge: false }>();
    if (parentError) throw new Error(`No se pudo cargar la categoría: ${parentError.message}`);
    parent = parentRow;
  }
  return { ...data, parent };
}

export async function getIphoneModels(): Promise<IphoneModel[]> {
  const { data, error } = await supabase
    .from("iphone_models")
    .select("id, name, slug")
    .order("sort_order")
    .order("name")
    .overrideTypes<IphoneModel[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los modelos: ${error.message}`);
  return data;
}

/** Un modelo por slug, para la URL /modelo/[slug]. */
export async function getIphoneModel(slug: string): Promise<IphoneModel | null> {
  const { data, error } = await supabase
    .from("iphone_models")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<IphoneModel, { merge: false }>();
  if (error) throw new Error(`No se pudo cargar el modelo: ${error.message}`);
  return data;
}

export type ModelLine = { key: string; label: string; models: IphoneModel[] };

/**
 * Agrupa los modelos reales por línea numérica (11, 12, …, 18) para la
 * franja "Elegí tu iPhone" de la home: un botón grande por línea, que se
 * expande a sus modelos en el orden de sort_order (base, Air, Pro, Pro Max).
 */
export function groupModelsByLine(models: IphoneModel[]): ModelLine[] {
  const byLine = new Map<string, IphoneModel[]>();

  for (const model of models) {
    const key = model.name.match(/^iPhone (\d+)/)?.[1];
    if (!key) continue;
    if (!byLine.has(key)) byLine.set(key, []);
    byLine.get(key)!.push(model);
  }

  return [...byLine.keys()]
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => ({ key, label: key, models: byLine.get(key)! }));
}

/**
 * Productos activos de una categoría de tope: los suyos y los de todos sus
 * tipos, con solo sus variantes activas y con stock. Los filtros de la página
 * (modelo, tipo, orden) se aplican después en memoria con las funciones de
 * lib/catalogFilters: el catálogo es chico y así los contadores de los chips
 * salen de la misma consulta.
 */
export async function getProductsInCategory(categoryIds: string[]): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("category_id", categoryIds)
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .order("name")
    .order("price", { referencedTable: "product_variants" })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .overrideTypes<Product[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);
  return data;
}

/**
 * Productos (de cualquier categoría) compatibles con un modelo puntual:
 * variantes de ese modelo o universales (sin modelo). Para la página
 * /modelo/[id], que se accede desde la franja "Elegí tu iPhone" de la home.
 */
export async function getProductsByModel(modelId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .or(`iphone_model_id.eq.${modelId},iphone_model_id.is.null`, {
      referencedTable: "product_variants",
    })
    .order("name")
    .order("price", { referencedTable: "product_variants" })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .overrideTypes<Product[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);
  return data;
}

/** Productos para "destacados" de la home: los más nuevos con stock. */
export async function getFeaturedProducts(limit: number): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .limit(limit)
    .overrideTypes<Product[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los destacados: ${error.message}`);
  return data;
}

export type CategoryTile = { id: string; name: string; slug: string; href: string; count: number };

/** Link de una categoría: las de tope tienen página; un tipo es un filtro de su categoría. */
export function categoryHref(category: { slug: string }, parent?: { slug: string } | null): string {
  return parent ? `/categoria/${parent.slug}?tipo=${category.slug}` : `/categoria/${category.slug}`;
}

/**
 * Mosaicos de la home, con la cantidad de productos con stock: la primera
 * categoría (Fundas, lo principal) se abre en sus tipos y las demás van como
 * un solo mosaico con todo lo suyo. La foto de cada uno la elige la home.
 */
export async function getCategoryTiles(): Promise<CategoryTile[]> {
  const [groups, counts] = await Promise.all([getCategoryGroups(), getProductCountsByCategory()]);
  return groups.flatMap((group, index) => {
    if (index === 0 && group.children.length > 0) {
      return group.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        href: categoryHref(child, group),
        count: counts[child.id] ?? 0,
      }));
    }
    const count = [group, ...group.children].reduce((sum, c) => sum + (counts[c.id] ?? 0), 0);
    return [{ id: group.id, name: group.name, slug: group.slug, href: categoryHref(group), count }];
  });
}

/** Un producto puntual con sus variantes activas y con stock, para el detalle. */
export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .maybeSingle()
    .overrideTypes<Product | null, { merge: false }>();
  if (error) throw new Error(`No se pudo cargar el producto: ${error.message}`);
  return data;
}

/** Cantidad de productos activos con al menos una variante activa y con stock, por categoría. */
export async function getProductCountsByCategory(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("products")
    .select("category_id, product_variants!inner(id)")
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .overrideTypes<{ category_id: string }[], { merge: false }>();
  if (error) throw new Error(`No se pudieron contar los productos: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of data) counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  return counts;
}
