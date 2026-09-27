"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminApiError,
  createProductVariant,
  getAdminCategories,
  getAdminIphoneModels,
  getAdminProducts,
  type AdminCategory,
  type AdminIphoneModel,
  type AdminProduct,
  type AdminVariant,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import {
  ADMIN_ALERT_ERROR,
  ADMIN_ALERT_OK,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_TITLE,
  ADMIN_ROW_LIST,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
} from "../adminStyles";
import Combobox from "../productos/Combobox";
import { suggestSku } from "../productos/sku";
import { displayColor } from "../ventas/utils";
import ProductImageGallery from "./ProductImageGallery";
import ProductNameEditor from "./ProductNameEditor";
import StockInput from "./StockInput";

const UNIVERSAL = "__universal__";
const PAGE_SIZE = 40;

type StockFilter = "all" | "zero" | "positive";

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

  const categoryPath = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    return (id: string) => {
      const cat = byId.get(id);
      if (!cat) return "";
      const parent = cat.parent_id ? byId.get(cat.parent_id) : undefined;
      return parent ? `${parent.name} > ${cat.name}` : cat.name;
    };
  }, [categories]);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [products],
  );

  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    const entries: { product: AdminProduct; variant: AdminVariant }[] = [];

    for (const product of products) {
      const nameMatches = term === "" || product.name.toLowerCase().includes(term);
      if (!nameMatches) continue;

      for (const variant of product.product_variants) {
        const modelMatches =
          selectedModelId === ""
            ? true
            : selectedModelId === UNIVERSAL
              ? variant.iphone_model_id === null
              : variant.iphone_model_id === selectedModelId;
        if (!modelMatches) continue;

        if (stockFilter === "zero" && variant.stock_quantity !== 0) continue;
        if (stockFilter === "positive" && variant.stock_quantity <= 0) continue;

        entries.push({ product, variant });
      }
    }

    entries.sort((a, b) => {
      const byName = a.product.name.localeCompare(b.product.name, "es");
      if (byName !== 0) return byName;
      return (a.variant.color ?? "").localeCompare(b.variant.color ?? "", "es");
    });

    return entries;
  }, [products, selectedModelId, stockFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = filteredEntries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const groups = useMemo(() => {
    const map = new Map<string, { product: AdminProduct; variants: AdminVariant[] }>();
    for (const { product, variant } of pageEntries) {
      const group = map.get(product.id);
      if (group) {
        group.variants.push(variant);
      } else {
        map.set(product.id, { product, variants: [variant] });
      }
    }
    return [...map.values()];
  }, [pageEntries]);

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

  function openAddDialog() {
    setProductId("");
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
      <div className="space-y-4 py-10 text-center">
        <p role="alert">{loadError}</p>
        <button type="button" onClick={retryLoad} className={ADMIN_BUTTON_PRIMARY}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className={ADMIN_PAGE_TITLE}>Catálogo y stock</h1>

      <section aria-labelledby="filtros" className={`${ADMIN_CARD} space-y-4`}>
        <h2 id="filtros" className="sr-only">
          Filtros
        </h2>

        <div>
          <label htmlFor="catalogo-modelo" className={ADMIN_LABEL}>
            Modelo de iPhone
          </label>
          <select
            id="catalogo-modelo"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className={ADMIN_INPUT}
          >
            <option value="">Todos los modelos</option>
            {sortedModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value={UNIVERSAL}>Sin modelo (accesorios universales)</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="catalogo-stock" className={ADMIN_LABEL}>
              Stock
            </label>
            <select
              id="catalogo-stock"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className={ADMIN_INPUT}
            >
              <option value="all">Todos</option>
              <option value="zero">Sin stock (0)</option>
              <option value="positive">Con stock (&gt;0)</option>
            </select>
          </div>

          <div>
            <label htmlFor="catalogo-buscar" className={ADMIN_LABEL}>
              Buscar producto
            </label>
            <input
              id="catalogo-buscar"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Estelar, MagCase…"
              className={ADMIN_INPUT}
            />
          </div>
        </div>
      </section>

      <dialog
        ref={addDialogRef}
        aria-labelledby="agregar-variante"
        className="fixed inset-0 m-auto h-fit w-full max-w-lg rounded-md border border-admin-border bg-white p-6 backdrop:bg-black/40"
      >
        <div className="space-y-4">
          <h2 id="agregar-variante" className={ADMIN_SECTION_TITLE}>
            Agregar variante nueva
          </h2>

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
              <option value={UNIVERSAL}>Sin modelo (accesorios universales)</option>
            </select>
          </div>

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
            <label htmlFor="catalogo-color" className={ADMIN_LABEL}>
              Color (opcional)
            </label>
            <input
              id="catalogo-color"
              type="text"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setVariantError(null);
              }}
              placeholder="rojo"
              className={ADMIN_INPUT}
            />
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
              className={`${ADMIN_INPUT} font-mono`}
            />
            <p className={`mt-1.5 ${ADMIN_TEXT_MUTED}`}>
              {skuOverride === null ? (
                "Sugerido según producto, modelo y color. Podés editarlo."
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="catalogo-precio" className={ADMIN_LABEL}>
                Precio
              </label>
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
                placeholder="$"
                className={`${ADMIN_INPUT} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="catalogo-stock-inicial" className={ADMIN_LABEL}>
                Stock inicial
              </label>
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
                className={`${ADMIN_INPUT} font-mono`}
              />
            </div>
          </div>

          {variantError && <p role="alert" className={ADMIN_ALERT_ERROR}>{variantError}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={closeAddDialog} className={ADMIN_BUTTON_SECONDARY}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateVariant}
              disabled={!canSaveVariant}
              className={ADMIN_BUTTON_PRIMARY}
            >
              {savingVariant ? "Agregando…" : "Agregar variante"}
            </button>
          </div>
        </div>
      </dialog>

      <section aria-labelledby="lista-variantes" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="lista-variantes" className={ADMIN_SECTION_TITLE}>
            Variantes ({filteredEntries.length})
          </h2>
          <button type="button" onClick={openAddDialog} className={ADMIN_BUTTON_PRIMARY}>
            + Agregar variante
          </button>
        </div>

        {addedNotice && <p role="status" className={ADMIN_ALERT_OK}>{addedNotice}</p>}

        {groups.length === 0 ? (
          <p className={ADMIN_TEXT_MUTED}>No hay variantes que matcheen estos filtros.</p>
        ) : (
          <div className="space-y-4">
            {groups.map(({ product, variants }) => (
              <div key={product.id} className={`${ADMIN_CARD} space-y-4`}>
                <ProductImageGallery
                  productId={product.id}
                  images={product.product_images}
                  onChange={(images) => patchProductInState(product.id, { product_images: images })}
                />
                <ProductNameEditor
                  productId={product.id}
                  name={product.name}
                  onSaved={(name) => patchProductInState(product.id, { name })}
                />
                <ul className={ADMIN_ROW_LIST}>
                  {variants.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block font-mono text-xs text-admin-muted">{v.sku}</span>
                        <span className="mt-0.5 block text-sm text-admin-text">
                          {[
                            selectedModelId === ""
                              ? v.iphone_model_id
                                ? modelNameById.get(v.iphone_model_id)
                                : "Sin modelo"
                              : null,
                            displayColor(v.color),
                            formatPrice(v.price),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <StockInput variantId={v.id} initialStock={v.stock_quantity} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={ADMIN_BUTTON_SECONDARY}
            >
              Anterior
            </button>
            <span className={ADMIN_TEXT_MUTED}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={ADMIN_BUTTON_SECONDARY}
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
