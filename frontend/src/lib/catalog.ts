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
  product_images: ProductImage[];
  product_variants: Variant[];
};

/** La portada de un producto: su primera imagen (sort_order más bajo), o null si no tiene ninguna. */
export function coverImage(product: Pick<Product, "product_images">): string | null {
  return product.product_images[0]?.url ?? null;
}

const PRODUCT_SELECT =
  "id, name, description, product_images(id, url, sort_order), product_variants!inner(id, sku, color, price, stock_quantity, iphone_model_id, iphone_models(name))";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

/** Categorías padre con sus subcategorías, ordenadas por nombre. */
export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
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
): Promise<(Category & { parent: { id: string; name: string } | null }) | null> {
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
  let parent: { id: string; name: string } | null = null;
  if (data.parent_id) {
    const { data: parentRow, error: parentError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("id", data.parent_id)
      .maybeSingle()
      .overrideTypes<{ id: string; name: string }, { merge: false }>();
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

// Agrupa los 22 modelos reales por línea (11, 12, ..., 17, Air) para la
// franja "Elegí tu iPhone" de la home: se ven 8 botones grandes, pero se
// puede llegar a los 22 reales expandiendo la línea elegida.
export function groupModelsByLine(models: IphoneModel[]): ModelLine[] {
  const LINE_ORDER = ["11", "12", "13", "14", "15", "16", "17", "Air"];
  const byLine = new Map<string, IphoneModel[]>();

  for (const model of models) {
    const match = model.name.match(/^iPhone (\d+|Air)/);
    const key = match ? match[1] : model.name;
    if (!byLine.has(key)) byLine.set(key, []);
    byLine.get(key)!.push(model);
  }

  return LINE_ORDER.filter((key) => byLine.has(key)).map((key) => ({
    key,
    label: key,
    models: byLine.get(key)!,
  }));
}

/**
 * Productos activos de una categoría, con solo sus variantes activas y con stock.
 * Con `modelId`, deja las variantes de ese modelo o sin restricción de modelo;
 * los productos que se quedan sin variantes no aparecen (`!inner`).
 */
export async function getProductsByCategory(
  categoryId: string,
  modelId?: string,
): Promise<Product[]> {
  // Una categoría con subcategorías (ej. "Fundas") no tiene productos propios:
  // agrega los de sus hijas. Una hoja (ej. "Accesorios") solo trae los suyos.
  const { data: children, error: childrenError } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", categoryId)
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (childrenError) throw new Error(`No se pudieron cargar las categorías: ${childrenError.message}`);
  const categoryIds = children.length > 0 ? children.map((c) => c.id) : [categoryId];

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("category_id", categoryIds)
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0);

  if (modelId) {
    // modelId ya viene validado como UUID: es seguro interpolarlo en el filtro.
    query = query.or(`iphone_model_id.eq.${modelId},iphone_model_id.is.null`, {
      referencedTable: "product_variants",
    });
  }

  const { data, error } = await query
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
    .select(`${PRODUCT_SELECT}, created_at`)
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .limit(limit)
    .overrideTypes<(Product & { created_at: string })[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los destacados: ${error.message}`);
  return data;
}

export type CategoryTile = Category & { count: number; imageUrl: string | null };

/**
 * Las categorías hoja (con productos propios) para el grid de la home:
 * nombre, cantidad de productos con stock y una foto representativa
 * (la del primer producto con imagen, por orden alfabético).
 */
export async function getCategoryTiles(): Promise<CategoryTile[]> {
  const [groups, counts] = await Promise.all([getCategoryGroups(), getProductCountsByCategory()]);
  const leaves = groups.flatMap((g) => (g.children.length > 0 ? g.children : [g]));

  const { data, error } = await supabase
    .from("products")
    .select("category_id, product_images(url, sort_order)")
    .eq("active", true)
    .order("name")
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .overrideTypes<{ category_id: string; product_images: { url: string; sort_order: number }[] }[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar las fotos de categoría: ${error.message}`);

  const imageByCategory = new Map<string, string>();
  for (const row of data) {
    const url = row.product_images[0]?.url;
    if (url && !imageByCategory.has(row.category_id)) imageByCategory.set(row.category_id, url);
  }

  return leaves.map((c) => ({
    ...c,
    count: counts[c.id] ?? 0,
    imageUrl: imageByCategory.get(c.id) ?? null,
  }));
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
