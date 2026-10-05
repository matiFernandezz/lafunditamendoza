"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ImageOff, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  getAdminCategories,
  getAdminIphoneModels,
  getAdminProducts,
  updateProduct,
  updateVariant,
  type AdminCategory,
  type AdminIphoneModel,
  type AdminProduct,
  type AdminVariant,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { colorsWithoutPhotos, motifsWithoutPhotos } from "@/lib/productColors";
import AdminNotice from "../AdminNotice";
import { LIBRARY_TOUCHED_PRODUCTS } from "../attributeLibrary";
import { categoryPathById, categorySubtree, isAccessoryCategory } from "../categoryPath";
import {
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminInput,
  adminSegment,
} from "../adminStyles";
import AddVariantDialog from "./AddVariantDialog";
import CategoryColors from "./CategoryColors";
import ProductEditor from "./ProductEditor";
import { EMPTY_DRAFT, draftChanges, type CatalogDraft } from "./catalogDraft";

const UNIVERSAL = "__universal__";
// Productos (tarjetas) por página: todas las páginas traen la misma cantidad.
const PAGE_SIZE = 10;

type StockFilter = "all" | "zero" | "positive";

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "positive", label: "Con stock" },
  { value: "zero", label: "Sin stock" },
];

async function loadData() {
  const [categories, models, products] = await Promise.all([
    getAdminCategories(),
    getAdminIphoneModels(),
    getAdminProducts(),
  ]);
  return { categories: categories.data, models: models.data, products: products.data };
}

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

export default function CatalogoPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [models, setModels] = useState<AdminIphoneModel[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filtros
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Tarjeta desplegada; null = todas cerradas (así arranca cada página).
  const [openId, setOpenId] = useState<string | null>(null);

  // Cambios sin guardar por producto (ver catalogDraft). Sobreviven a cerrar
  // la tarjeta o cambiar de página: la tarjeta queda marcada "Sin guardar".
  const [drafts, setDrafts] = useState<Record<string, CatalogDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{ productId: string; message: string } | null>(null);

  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  // Ventana "Agregar variante": null = cerrada; "" = abierta sin producto elegido.
  const [addFor, setAddFor] = useState<string | null>(null);

  const sortedModels = useMemo(
    () => [...models].sort((a, b) => a.sort_order - b.sort_order),
    [models],
  );

  useEffect(() => {
    let ignore = false;

    loadData()
      .then((result) => {
        if (ignore) return;
        setCategories(result.categories);
        setModels(result.models);
        setProducts(result.products);
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Cambiar cualquier filtro vuelve a la primera página. Se ajusta durante el
  // render (comparando contra el filtro anterior guardado en estado), no en
  // un efecto: https://react.dev/learn/you-might-not-need-an-effect
  const filterKey = `${selectedCategoryId}|${selectedModelId}|${stockFilter}|${search}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    loadData()
      .then((result) => {
        setCategories(result.categories);
        setModels(result.models);
        setProducts(result.products);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
      })
      .finally(() => setLoading(false));
  }

  // Se agregaron o eliminaron variantes (desde un producto, la ventana o una
  // categoría): se muestra el resultado y se vuelve a pedir la lista.
  async function handleColorsChanged(message: string) {
    setAddedNotice(message);
    await refreshProducts();
  }

  async function refreshProducts() {
    try {
      const res = await getAdminProducts();
      setProducts(res.data);
    } catch {
      // El próximo guardado o "Reintentar" lo refresca.
    }
  }

  // Al renombrar, unir o eliminar un color o un motivo ("Editar colores")
  // cambian las variantes: se vuelve a pedir la lista.
  useEffect(() => {
    const onTouched = () => {
      getAdminProducts()
        .then((res) => setProducts(res.data))
        .catch(() => {});
    };
    window.addEventListener(LIBRARY_TOUCHED_PRODUCTS, onTouched);
    return () => window.removeEventListener(LIBRARY_TOUCHED_PRODUCTS, onTouched);
  }, []);

  function patchProductInState(productId: string, patch: Partial<AdminProduct>) {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...patch } : p)));
  }

  function updateDraft(productId: string, update: (draft: CatalogDraft) => CatalogDraft) {
    setDrafts((prev) => ({ ...prev, [productId]: update(prev[productId] ?? EMPTY_DRAFT) }));
    setSaveError(null);
    setSavedId(null);
  }

  function discardDraft(productId: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setSaveError(null);
  }

  // Guarda de una vez todo lo que cambió en el producto: nombre, descripción y
  // el stock y precio de cada variante tocada. Lo que se guardó sale del
  // borrador; si algo falla, ese campo queda marcado para reintentar.
  async function handleSave(product: AdminProduct) {
    const draft = drafts[product.id] ?? EMPTY_DRAFT;
    const changes = draftChanges(product, draft);
    if (savingId !== null || changes.invalid.size > 0 || changes.count === 0) return;

    setSavingId(product.id);
    setSaveError(null);
    setSavedId(null);

    const hasProductPatch = Object.keys(changes.productPatch).length > 0;
    const [productResult, ...variantResults] = await Promise.allSettled([
      hasProductPatch ? updateProduct(product.id, changes.productPatch) : Promise.resolve(null),
      ...changes.variants.map(({ id, ...patch }) => updateVariant(id, patch)),
    ]);

    const failures: unknown[] = [];
    const saved = new Map<string, AdminVariant>();
    variantResults.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) saved.set(changes.variants[index].id, result.value.data);
      else if (result.status === "rejected") failures.push(result.reason);
    });
    const productSaved = productResult.status === "fulfilled" ? productResult.value?.data ?? null : null;
    if (productResult.status === "rejected") failures.push(productResult.reason);

    setProducts((prev) =>
      prev.map((p) =>
        p.id !== product.id
          ? p
          : {
              ...p,
              ...(productSaved ? { name: productSaved.name, description: productSaved.description } : {}),
              product_variants: p.product_variants.map((v) => {
                const fresh = saved.get(v.id);
                return fresh ? { ...v, stock_quantity: fresh.stock_quantity, price: fresh.price } : v;
              }),
            },
      ),
    );

    setDrafts((prev) => {
      const current = prev[product.id];
      if (!current) return prev;
      const rest: CatalogDraft = { ...current, stock: { ...current.stock }, price: { ...current.price } };
      if (productResult.status === "fulfilled") {
        delete rest.name;
        delete rest.description;
      }
      for (const id of saved.keys()) {
        delete rest.stock[id];
        delete rest.price[id];
      }
      return { ...prev, [product.id]: rest };
    });

    if (failures.length > 0) {
      setSaveError({
        productId: product.id,
        message: `${
          failures.length === 1 ? "No se pudo guardar 1 cambio" : `No se pudieron guardar ${failures.length} cambios`
        }: ${errorMessage(failures[0]).replace(/\.?$/, ".")} El resto quedó guardado.`,
      });
    } else {
      setSavedId(product.id);
      setTimeout(() => setSavedId((id) => (id === product.id ? null : id)), 2500);
    }
    setSavingId(null);
  }

  const categoryPath = useMemo(() => categoryPathById(categories), [categories]);

  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  const modelOrderById = useMemo(() => new Map(models.map((m) => [m.id, m.sort_order])), [models]);

  // Un grupo por producto, con las variantes que pasan los filtros. Un producto
  // recién creado todavía no tiene variantes: se muestra igual (si no, no hay
  // forma de cargárselas), salvo que haya un filtro de modelo o de stock.
  const isAccessory = useMemo(() => isAccessoryCategory(categories), [categories]);
  // Categorías de tope con sus tipos, para el filtro.
  const categoryTree = useMemo(() => {
    const byName = (a: AdminCategory, b: AdminCategory) => a.name.localeCompare(b.name, "es");
    return categories
      .filter((c) => c.parent_id === null)
      .sort(byName)
      .map((parent) => ({ parent, children: categories.filter((c) => c.parent_id === parent.id).sort(byName) }));
  }, [categories]);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const inCategory = selectedCategoryId === "" ? null : categorySubtree(categories, selectedCategoryId);
    const filteringVariants = selectedModelId !== "" || stockFilter !== "all";
    const result: { product: AdminProduct; variants: AdminVariant[] }[] = [];

    for (const product of products) {
      if (term !== "" && !product.name.toLowerCase().includes(term)) continue;
      if (inCategory && !inCategory.has(product.category_id)) continue;

      const variants = product.product_variants.filter((variant) => {
        if (selectedModelId === UNIVERSAL && variant.iphone_model_id !== null) return false;
        if (selectedModelId !== "" && selectedModelId !== UNIVERSAL && variant.iphone_model_id !== selectedModelId)
          return false;
        if (stockFilter === "zero" && variant.stock_quantity !== 0) return false;
        if (stockFilter === "positive" && variant.stock_quantity <= 0) return false;
        return true;
      });

      if (variants.length === 0 && (filteringVariants || product.product_variants.length > 0)) continue;

      const modelOrder = (v: AdminVariant) =>
        v.iphone_model_id === null ? Infinity : modelOrderById.get(v.iphone_model_id) ?? Infinity;
      variants.sort((a, b) => {
        const byModel = modelOrder(a) - modelOrder(b);
        // Infinity - Infinity es NaN: dos variantes sin modelo empatan.
        if (byModel) return byModel;
        return (a.color ?? "").localeCompare(b.color ?? "", "es");
      });

      result.push({ product, variants });
    }

    result.sort((a, b) => a.product.name.localeCompare(b.product.name, "es"));
    return result;
  }, [products, categories, selectedCategoryId, selectedModelId, stockFilter, search, modelOrderById]);

  const filteredVariantCount = filteredGroups.reduce((sum, g) => sum + g.variants.length, 0);

  // Se pagina por producto, no por variante: paginar variantes dejaba páginas
  // con 2 tarjetas y otras con 5 según cuántas variantes tuviera cada producto.
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const groups = filteredGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Cambiar de página vuelve arriba con todas las tarjetas cerradas.
  function goToPage(next: number) {
    setPage(Math.min(totalPages, Math.max(1, next)));
    setOpenId(null);
    window.scrollTo({ top: 0 });
  }

  const openAddDialog = (presetProductId = "") => setAddFor(presetProductId);

  if (loading) {
    return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>;
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10">
        <AdminNotice kind="danger">{loadError}</AdminNotice>
        <button type="button" onClick={retryLoad} className={adminButton("primary")}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Catálogo y stock</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            {filteredGroups.length === 1 ? "1 producto" : `${filteredGroups.length} productos`} ·{" "}
            {filteredVariantCount === 1 ? "1 variante" : `${filteredVariantCount} variantes`}
          </p>
        </div>
        <button type="button" onClick={() => openAddDialog()} className={adminButton("primary")}>
          <Plus aria-hidden="true" className="size-[18px]" />
          <span className="hidden sm:inline">Agregar variante</span>
          <span className="sm:hidden">Variante</span>
        </button>
      </div>

      {addedNotice && (
        <AdminNotice kind="ok" onClose={() => setAddedNotice(null)}>
          {addedNotice}
        </AdminNotice>
      )}

      <section
        aria-label="Filtros"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]"
      >
        <div className="relative">
          <label htmlFor="catalogo-buscar" className="sr-only">
            Buscar producto
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-admin-muted"
          />
          <input
            id="catalogo-buscar"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto: Estelar, MagCase…"
            className={adminInput({ prefix: "icon" })}
          />
        </div>

        <div>
          <label htmlFor="catalogo-categoria" className="sr-only">
            Categoría
          </label>
          <select
            id="catalogo-categoria"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className={ADMIN_INPUT}
          >
            <option value="">Todas las categorías</option>
            {categoryTree.map(({ parent, children }) =>
              children.length > 0 ? (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.id}>{parent.name} (todo)</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label htmlFor="catalogo-modelo" className="sr-only">
            Modelo de iPhone
          </label>
          <select
            id="catalogo-modelo"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className={ADMIN_INPUT}
          >
            <option value="">Todos los modelos</option>
            <option value={UNIVERSAL}>Universales</option>
            {sortedModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div role="radiogroup" aria-label="Stock" className="grid grid-cols-3 gap-2">
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={stockFilter === f.value}
              onClick={() => setStockFilter(f.value)}
              className={adminSegment(stockFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Colores en bloque: solo al filtrar por una categoría que no sea de Accesorios. */}
      {selectedCategory && !isAccessory(selectedCategory.id) && (
        <CategoryColors
          key={selectedCategory.id}
          category={selectedCategory}
          models={sortedModels}
          onChanged={handleColorsChanged}
        />
      )}

      {addFor !== null && (
        <AddVariantDialog
          products={products}
          models={sortedModels}
          isAccessory={isAccessory}
          categoryPath={categoryPath}
          presetProductId={addFor}
          onClose={() => setAddFor(null)}
          onAdded={handleColorsChanged}
        />
      )}

      {groups.length === 0 ? (
        <p className={ADMIN_EMPTY}>No hay productos con esos filtros.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map(({ product, variants }) => {
            const open = openId === product.id;
            const all = product.product_variants;
            const units = all.reduce((sum, v) => sum + v.stock_quantity, 0);
            const outs = all.filter((v) => v.stock_quantity === 0).length;
            const prices = [...new Set(all.map((v) => v.price))];
            const thumb = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
            const panelId = `producto-${product.id}`;
            const draft = drafts[product.id] ?? EMPTY_DRAFT;
            const unsaved = draftChanges(product, draft).dirty;

            return (
              <li key={product.id} className="min-w-0 overflow-clip rounded-md border border-admin-border bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : product.id)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex min-h-[72px] w-full items-center gap-3 py-3 pl-4 pr-3 text-left transition-colors duration-200 hover:bg-admin-bg"
                >
                  <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-admin-border bg-admin-bg">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa (Storage), igual que la galería.
                      <img src={thumb} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff aria-hidden="true" className="size-5 text-admin-muted" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words text-base font-semibold text-admin-text">
                      {product.name}
                      {product.product_images.length === 0 && <span className={adminBadge("warn")}>Sin foto</span>}
                      {colorsWithoutPhotos(all, product.product_images).length > 0 && (
                        <span className={adminBadge("warn")}>Color sin foto</span>
                      )}
                      {motifsWithoutPhotos(all, product.product_images).length > 0 && (
                        <span className={adminBadge("warn")}>Motivo sin foto</span>
                      )}
                      {unsaved && <span className={adminBadge("ink")}>Sin guardar</span>}
                    </span>
                    <span className={`mt-0.5 flex flex-wrap gap-x-1.5 ${ADMIN_TEXT_MUTED}`}>
                      <span>
                        {all.length === 1 ? "1 variante" : `${all.length} variantes`} · {units} u.
                      </span>
                      {outs > 0 && <span className="font-semibold text-admin-danger">· {outs} sin stock</span>}
                      <span className="hidden lg:inline">
                        · {categoryPath(product.category_id)} ·{" "}
                        {prices.length === 0
                          ? "sin precio"
                          : prices.length === 1
                            ? formatPrice(prices[0])
                            : "varios precios"}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-[22px] shrink-0 text-admin-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && (
                  <div id={panelId}>
                    <ProductEditor
                      product={product}
                      variants={variants}
                      draft={draft}
                      onDraftChange={(update) => updateDraft(product.id, update)}
                      modelNameById={modelNameById}
                      onVariantsChanged={handleColorsChanged}
                      saving={savingId === product.id}
                      error={saveError?.productId === product.id ? saveError.message : null}
                      justSaved={savedId === product.id}
                      onSave={() => handleSave(product)}
                      onDiscard={() => discardDraft(product.id)}
                      onImagesChange={(images) => patchProductInState(product.id, { product_images: images })}
                      onAddVariant={() => openAddDialog(product.id)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={adminButton("secondary")}
          >
            <ChevronLeft aria-hidden="true" className="size-[18px]" />
            Anterior
          </button>
          <span className={`text-center ${ADMIN_TEXT_MUTED}`}>
            Página {currentPage} de {totalPages}
            <span className="hidden sm:inline">
              {" "}
              · productos {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredGroups.length)} de {filteredGroups.length}
            </span>
          </span>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={adminButton("secondary")}
          >
            Siguiente
            <ChevronRight aria-hidden="true" className="size-[18px]" />
          </button>
        </div>
      )}
    </div>
  );
}
