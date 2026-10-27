import { parseSlideLayout, type SlideLayout } from "./slideLayout";
import { supabase } from "./supabase";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  /** Foto de su mosaico en la home (la elige el panel › Tienda). */
  home_image_url?: string | null;
};

export type CategoryGroup = Category & { children: Category[] };

export type IphoneModel = {
  id: string;
  name: string;
  slug: string;
};

export type MotifRef = { id: string; name: string; slug: string; sort_order: number };

export type ColorRef = { id: string; name: string; slug: string; hex: string; sort_order: number };

export type Variant = {
  id: string;
  sku: string;
  /** Nombre del color, o una descripción libre si la variante no tiene color_ref. */
  color: string | null;
  color_ref: ColorRef | null;
  /** El motivo (BATMAN…), si el producto usa motivos en vez de colores. */
  motif_ref: MotifRef | null;
  price: number;
  stock_quantity: number;
  iphone_model_id: string | null;
  iphone_models: { name: string; sort_order: number } | null;
};

export type ProductImage = {
  id: string;
  url: string;
  sort_order: number;
  /** color_id y motif_id null = foto general del producto. */
  color_id: string | null;
  motif_id: string | null;
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

/**
 * La portada de un producto: su primera foto general (sort_order más bajo); si
 * todas son de algún color o motivo, la primera que haya. null si no tiene ninguna.
 */
export function coverImage(product: Pick<Product, "product_images">): string | null {
  const images = product.product_images;
  return (images.find((img) => img.color_id === null && img.motif_id === null) ?? images[0])?.url ?? null;
}

const PRODUCT_SELECT =
  "id, name, description, created_at, category:categories(id, name, slug, parent_id), product_images(id, url, sort_order, color_id, motif_id), product_variants!inner(id, sku, color, price, stock_quantity, iphone_model_id, iphone_models(name, sort_order), color_ref:colors(id, name, slug, hex, sort_order), motif_ref:motifs(id, name, slug, sort_order))";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value);

/**
 * Categorías de tope (las del menú: Fundas, Accesorios) con sus tipos, en el
 * orden de sort_order.
 */
/** Slug de la página con todos los productos: /categoria/todo. */
export const ALL_PRODUCTS_SLUG = "todo";

/**
 * "Todos los productos" como si fuera una categoría más: sus tipos son todas
 * las categorías donde se cargan productos (los tipos de cada grupo, o el
 * grupo mismo si no tiene). Así la página usa los mismos filtros que el resto.
 */
export function allProductsGroup(groups: CategoryGroup[]): CategoryGroup {
  return {
    id: ALL_PRODUCTS_SLUG,
    name: "Todos los productos",
    slug: ALL_PRODUCTS_SLUG,
    parent_id: null,
    children: groups.flatMap(({ children, ...group }) => (children.length > 0 ? [group, ...children] : [group])),
  };
}

export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, home_image_url")
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

export type CategoryTile = {
  id: string;
  name: string;
  slug: string;
  href: string;
  count: number;
  imageUrl: string | null;
};

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
        imageUrl: child.home_image_url ?? null,
      }));
    }
    const count = [group, ...group.children].reduce((sum, c) => sum + (counts[c.id] ?? 0), 0);
    return [
      {
        id: group.id,
        name: group.name,
        slug: group.slug,
        href: categoryHref(group),
        count,
        imageUrl: group.home_image_url ?? null,
      },
    ];
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

// ---------------------------------------------------------------------------
// Contenido de la home que se edita en el panel › Tienda.
// ---------------------------------------------------------------------------

export type HomeSlideRow = {
  id: string;
  image_url: string;
  /** Foto propia para el celular (vertical); null = se recorta la de computadora. */
  mobile_image_url: string | null;
  alt: string;
  kind: "rango" | "titulo" | "logo" | "foto";
  label: string | null;
  title: string | null;
  /** Bajada del rango de modelos (null = la de siempre). */
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  position: string | null;
  /** Encuadre en el celular (null = el mismo que en computadora). */
  position_mobile: string | null;
  dim: number | null;
  /** Tamaño del texto (null = automático, según el tipo). */
  text_size: "chico" | "mediano" | "grande" | null;
  /** Dónde va el texto, "arriba-izquierda"… (null = automático, según el tipo). */
  text_position: `${"arriba" | "centro" | "abajo"}-${"izquierda" | "centro" | "derecha"}` | null;
  /** Dónde va el logo (null = sin logo; en el tipo "logo", abajo a la izquierda). */
  logo_position: HomeSlideRow["text_position"];
  /** Tamaño del logo (null = mediano, el de siempre). */
  logo_size: HomeSlideRow["text_size"];
  /** Diseño del editor, por dispositivo (null = el carrusel de antes). */
  layout: SlideLayout | null;
};

/** Fotos del carrusel de la portada, en orden. */
export async function getHomeSlides(): Promise<HomeSlideRow[]> {
  const { data, error } = await supabase
    .from("home_slides")
    .select(
      "id, image_url, mobile_image_url, alt, kind, label, title, subtitle, cta_label, cta_href, position, position_mobile, dim, text_size, text_position, logo_position, logo_size, layout",
    )
    .order("sort_order")
    .order("created_at")
    .overrideTypes<HomeSlideRow[], { merge: false }>();
  if (error) throw new Error(`No se pudo cargar el carrusel: ${error.message}`);
  // Un diseño que no pase la validación (no debería: lo valida la API) se ignora.
  return data.map((slide) => {
    const parsed = slide.layout ? parseSlideLayout(slide.layout) : null;
    return { ...slide, layout: parsed && "layout" in parsed ? parsed.layout : null };
  });
}

export type NewArrivalItem = {
  product: Product;
  /** PNG sin fondo (el teléfono que gira). */
  imageUrl: string;
  /** Color del canto de la funda. */
  edgeColor: string;
};

/**
 * "Nuevos ingresos" en el orden del panel, con los datos de hoy de cada
 * producto. Los que no están activos o no tienen stock no aparecen.
 */
export async function getHomeNewArrivals(): Promise<NewArrivalItem[]> {
  const { data: rows, error } = await supabase
    .from("home_new_arrivals")
    .select("product_id, image_url, edge_color")
    .order("sort_order")
    .order("created_at")
    .overrideTypes<{ product_id: string; image_url: string; edge_color: string }[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los nuevos ingresos: ${error.message}`);
  if (rows.length === 0) return [];

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", [...new Set(rows.map((r) => r.product_id))])
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .overrideTypes<Product[], { merge: false }>();
  if (productsError) throw new Error(`No se pudieron cargar los nuevos ingresos: ${productsError.message}`);

  const byId = new Map(products.map((p) => [p.id, p]));
  return rows.flatMap((row) => {
    const product = byId.get(row.product_id);
    return product ? [{ product, imageUrl: row.image_url, edgeColor: row.edge_color }] : [];
  });
}

export type AboutContent = {
  title: string;
  /** Párrafos del texto (en la base van separados por una línea en blanco). */
  paragraphs: string[];
  photos: string[];
  posts: { network: "instagram" | "tiktok"; url: string }[];
};

/** Página Nosotros: texto, fotos y publicaciones, como las dejó el panel › Tienda › Nosotros. */
export async function getAboutContent(): Promise<AboutContent> {
  const [page, photos, posts] = await Promise.all([
    supabase.from("about_page").select("title, body").eq("id", 1).single(),
    supabase.from("about_photos").select("image_url").order("sort_order").order("created_at"),
    supabase.from("social_posts").select("network, url").order("sort_order").order("created_at"),
  ]);
  const error = page.error ?? photos.error ?? posts.error;
  if (error || !page.data) throw new Error(`No se pudo cargar Nosotros: ${error?.message ?? "sin texto"}`);
  return {
    title: page.data.title,
    paragraphs: page.data.body
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter(Boolean),
    photos: (photos.data ?? []).map((p) => p.image_url as string),
    posts: (posts.data ?? []) as AboutContent["posts"],
  };
}

export type HomeSectionRow = {
  key: "categorias" | "mas_vendidas" | "ultimos" | "instagram";
  visible: boolean;
  title: string;
};

/** Secciones de la home debajo de "Elegí tu iPhone", en el orden del panel. */
export async function getHomeSections(): Promise<HomeSectionRow[]> {
  const { data, error } = await supabase
    .from("home_sections")
    .select("key, visible, title")
    .order("sort_order")
    .overrideTypes<HomeSectionRow[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar las secciones: ${error.message}`);
  return data;
}

/**
 * Buscador del header: productos activos con stock cuyo nombre, descripción o
 * categoría contienen lo buscado; también busca en sus modelos, colores y
 * diseños ("13 pro", "rosa"). Sin tildes ni mayúsculas que importen.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const term = query
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (term.length < 2) return [];

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("product_variants.active", true)
    .gt("product_variants.stock_quantity", 0)
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .overrideTypes<Product[], { merge: false }>();
  if (error) throw new Error(`No se pudo buscar: ${error.message}`);

  // Pocos productos (decenas): se filtra acá, con todas las palabras y sin tildes.
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const words = fold(term).split(" ");
  return data.filter((product) => {
    const variants = product.product_variants
      .map((v) => [v.iphone_models?.name, v.color, v.motif_ref?.name].filter(Boolean).join(" "))
      .join(" ");
    const haystack = fold([product.name, product.description ?? "", product.category?.name ?? "", variants].join(" "));
    return words.every((word) => haystack.includes(word));
  });
}
