import { supabase } from "./supabase";

export type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

export type CategoryGroup = Category & { children: Category[] };

export type IphoneModel = {
  id: string;
  name: string;
};

export type Variant = {
  id: string;
  sku: string;
  color: string | null;
  price: number;
  stock_quantity: number;
  iphone_models: { name: string } | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  product_variants: Variant[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

/** Categorías padre con sus subcategorías, ordenadas por nombre. */
export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
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

/** Una categoría con el nombre de su padre (null si no existe). */
export async function getCategory(
  id: string,
): Promise<(Category & { parent: { id: string; name: string } | null }) | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("id", id)
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
    .select("id, name")
    .order("sort_order")
    .order("name")
    .overrideTypes<IphoneModel[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los modelos: ${error.message}`);
  return data;
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
  let query = supabase
    .from("products")
    .select(
      "id, name, description, product_variants!inner(id, sku, color, price, stock_quantity, iphone_models(name))",
    )
    .eq("category_id", categoryId)
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
    .overrideTypes<Product[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);
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
