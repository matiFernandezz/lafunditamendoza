"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ImageOff, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminApiError,
  createProductVariant,
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
import AdminNotice from "../AdminNotice";
import { categoryPathById } from "../categoryPath";
import {
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_INPUT_ADORNMENT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminInput,
  adminSegment,
} from "../adminStyles";
import Combobox from "../productos/Combobox";
import { suggestSku } from "../productos/sku";
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

  // Formulario de "agregar variante nueva"
  const [productId, setProductId] = useState("");
  const [color, setColor] = useState("");
  const [skuOverride, setSkuOverride] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [savingVariant, setSavingVariant] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [addModelId, setAddModelId] = useState("");
  const addDialogRef = useRef<HTMLDialogElement>(null);

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
  const filterKey = `${selectedModelId}|${stockFilter}|${search}`;
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

  async function refreshProducts() {
    try {
      const res = await getAdminProducts();
      setProducts(res.data);
    } catch {
      // El próximo guardado o "Reintentar" lo refresca.
    }
  }

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

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [products],
  );

  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  const modelOrderById = useMemo(() => new Map(models.map((m) => [m.id, m.sort_order])), [models]);

  // Un grupo por producto, con las variantes que pasan los filtros. Un producto
  // recién creado todavía no tiene variantes: se muestra igual (si no, no hay
  // forma de cargárselas), salvo que haya un filtro de modelo o de stock.
  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filteringVariants = selectedModelId !== "" || stockFilter !== "all";
    const result: { product: AdminProduct; variants: AdminVariant[] }[] = [];

    for (const product of products) {
      if (term !== "" && !product.name.toLowerCase().includes(term)) continue;

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
  }, [products, selectedModelId, stockFilter, search, modelOrderById]);

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

  const selectedProduct = products.find((p) => p.id === productId);
  const addModelName =
    addModelId === UNIVERSAL ? "" : modelNameById.get(addModelId) ?? "";
  const suggestedSku = suggestSku(selectedProduct?.name ?? "", addModelName, color);
  const sku = skuOverride ?? suggestedSku;

  const priceNumber = Number(price);
  const stockNumber = stock.trim() === "" ? 0 : Number(stock);
  const priceValid = price.trim() !== "" && Number.isFinite(priceNumber) && priceNumber > 0;
  const stockValid = Number.isInteger(stockNumber) && stockNumber >= 0;
  const canSaveVariant =
    !savingVariant &&
    productId !== "" &&
    addModelId !== "" &&
    sku.trim() !== "" &&
    priceValid &&
    stockValid;

  // Desde una tarjeta llega con el producto elegido; desde el botón de arriba, vacío.
  function openAddDialog(presetProductId = "") {
    setProductId(presetProductId);
    setColor("");
    setSkuOverride(null);
    setPrice("");
    setStock("0");
    setVariantError(null);
    // Si el filtro de arriba es "Todos los modelos" no hay uno concreto para
    // preseleccionar: se arranca en el primero y se puede cambiar en el modal.
    setAddModelId(selectedModelId !== "" ? selectedModelId : sortedModels[0]?.id ?? "");
    addDialogRef.current?.showModal();
  }

  function closeAddDialog() {
    addDialogRef.current?.close();
  }

  async function handleCreateVariant() {
    if (!canSaveVariant) return;
    setSavingVariant(true);
    setVariantError(null);
    try {
      const res = await createProductVariant({
        product_id: productId,
        iphone_model_id: addModelId === UNIVERSAL ? null : addModelId,
        ...(color.trim() ? { color: color.trim() } : {}),
        sku: sku.trim(),
        price: priceNumber,
        stock_quantity: stockNumber,
      });
      closeAddDialog();
      setAddedNotice(`Variante ${res.data.sku} agregada.`);
      setTimeout(() => setAddedNotice(null), 4000);
      await refreshProducts();
    } catch (err) {
      setVariantError(errorMessage(err));
    } finally {
      setSavingVariant(false);
    }
  }

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
        className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)]"
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
            <option value={UNIVERSAL}>Sin modelo (universales)</option>
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

      <dialog
        ref={addDialogRef}
        aria-labelledby="agregar-variante"
        className="fixed inset-0 m-auto h-fit max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto rounded-lg bg-white p-6 backdrop:bg-black/45"
      >
        <div className="flex flex-col gap-4">
          <h2 id="agregar-variante" className={ADMIN_SECTION_TITLE}>
            Agregar variante
          </h2>

          <Combobox
            id="catalogo-producto"
            label="Producto"
            placeholder="Elegí un producto"
            options={sortedProducts.map((p) => ({
              id: p.id,
              label: p.name,
              sublabel: categoryPath(p.category_id),
            }))}
            value={productId}
            onChange={(id) => {
              setProductId(id);
              setSkuOverride(null);
              setVariantError(null);
            }}
          />

          <div>
            <label htmlFor="catalogo-agregar-modelo" className={ADMIN_LABEL}>
              Modelo de iPhone
            </label>
            <select
              id="catalogo-agregar-modelo"
              value={addModelId}
              onChange={(e) => {
                setAddModelId(e.target.value);
                setSkuOverride(null);
                setVariantError(null);
              }}
              className={ADMIN_INPUT}
            >
              {sortedModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              <option value={UNIVERSAL}>Sin modelo (sirve para todos)</option>
            </select>
          </div>

          <div>
            <label htmlFor="catalogo-color" className={ADMIN_LABEL}>
              Descripción
            </label>
            <input
              id="catalogo-color"
              type="text"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setVariantError(null);
              }}
              placeholder="Ej.: rosa, tipo C a C, 20W"
              className={ADMIN_INPUT}
            />
            <p className={`mt-1.5 ${ADMIN_TEXT_MUTED}`}>Opcional: color, tipo o lo que distinga a esta variante. Vacío = variante única.</p>
          </div>

          <div>
            <label htmlFor="catalogo-sku" className={ADMIN_LABEL}>
              SKU
            </label>
            <input
              id="catalogo-sku"
              type="text"
              value={sku}
              onChange={(e) => {
                setSkuOverride(e.target.value);
                setVariantError(null);
              }}
              autoCapitalize="characters"
              className={adminInput({ mono: true })}
            />
            <p className={`mt-1.5 ${ADMIN_TEXT_MUTED}`}>
              {skuOverride === null ? (
                "Sugerido según producto, modelo y descripción. Podés editarlo."
              ) : (
                <>
                  Editado a mano.{" "}
                  <button
                    type="button"
                    onClick={() => setSkuOverride(null)}
                    className="font-semibold text-admin-text underline underline-offset-2"
                  >
                    Volver a la sugerencia
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="catalogo-stock-inicial" className={ADMIN_LABEL}>
                Stock
              </label>
              <div className="relative">
                <input
                  id="catalogo-stock-inicial"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={stock}
                  onChange={(e) => {
                    setStock(e.target.value);
                    setVariantError(null);
                  }}
                  className={adminInput({ suffix: true, align: "right", mono: true })}
                />
                <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} right-3.5`}>
                  u.
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="catalogo-precio" className={ADMIN_LABEL}>
                Precio
              </label>
              <div className="relative">
                <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
                  $
                </span>
                <input
                  id="catalogo-precio"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setVariantError(null);
                  }}
                  className={adminInput({ prefix: "text", align: "right", mono: true })}
                />
              </div>
            </div>
          </div>

          {variantError && <AdminNotice kind="danger">{variantError}</AdminNotice>}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={closeAddDialog} className={adminButton("secondary")}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateVariant}
              disabled={!canSaveVariant}
              className={adminButton("primary")}
            >
              {savingVariant ? "Agregando…" : "Agregar"}
            </button>
          </div>
        </div>
      </dialog>

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
