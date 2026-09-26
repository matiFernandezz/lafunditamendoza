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
import Combobox from "../productos/Combobox";
import { suggestSku } from "../productos/sku";
import ProductImageField from "./ProductImageField";
import ProductNameEditor from "./ProductNameEditor";
import StockInput from "./StockInput";

const UNIVERSAL = "__universal__";
const PAGE_SIZE = 40;

const inputClass =
  "h-14 w-full rounded-2xl border border-graphite bg-transparent px-4 text-base";

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
    return <p className="py-10 text-center text-graphite">Cargando…</p>;
  }

  if (loadError) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p role="alert">{loadError}</p>
        <button
          type="button"
          onClick={retryLoad}
          className="h-14 rounded-2xl bg-ink px-6 text-base font-semibold text-paper"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Catálogo y stock</h1>

      <section aria-labelledby="filtros" className="space-y-4">
        <h2 id="filtros" className="sr-only">
          Filtros
        </h2>

        <div>
          <label htmlFor="catalogo-modelo" className="mb-1 block text-base font-medium">
            Modelo de iPhone
          </label>
          <select
            id="catalogo-modelo"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className={inputClass}
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
            <label htmlFor="catalogo-stock" className="mb-1 block text-base font-medium">
              Stock
            </label>
            <select
              id="catalogo-stock"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className={inputClass}
            >
              <option value="all">Todos</option>
              <option value="zero">Sin stock (0)</option>
              <option value="positive">Con stock (&gt;0)</option>
            </select>
          </div>

          <div>
            <label htmlFor="catalogo-buscar" className="mb-1 block text-base font-medium">
              Buscar producto
            </label>
            <input
              id="catalogo-buscar"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Estelar, MagCase…"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <dialog
        ref={addDialogRef}
        aria-labelledby="agregar-variante"
        className="fixed inset-0 m-auto h-fit w-full max-w-lg rounded-2xl border border-graphite bg-paper p-6 backdrop:bg-ink/40"
      >
        <div className="space-y-4">
          <h2 id="agregar-variante" className="font-display text-xl font-semibold tracking-tight">
            Agregar variante nueva
          </h2>

          <div>
            <label htmlFor="catalogo-agregar-modelo" className="mb-1 block text-base font-medium">
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
              className={inputClass}
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
            <label htmlFor="catalogo-color" className="mb-1 block text-base font-medium">
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
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="catalogo-sku" className="mb-1 block text-base font-medium">
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
              className={`${inputClass} font-mono`}
            />
            <p className="mt-1 text-sm text-graphite">
              {skuOverride === null ? (
                "Sugerido según producto, modelo y color. Podés editarlo."
              ) : (
                <>
                  Editado a mano.{" "}
                  <button
                    type="button"
                    onClick={() => setSkuOverride(null)}
                    className="min-h-11 font-medium text-ink underline underline-offset-2"
                  >
                    Volver a la sugerencia
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="catalogo-precio" className="mb-1 block text-base font-medium">
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
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="catalogo-stock-inicial" className="mb-1 block text-base font-medium">
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
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {variantError && (
            <p role="alert" className="rounded-2xl border border-ink p-3 text-base font-medium">
              {variantError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={closeAddDialog}
              className="h-14 rounded-2xl border border-ink text-base font-medium active:bg-rule"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateVariant}
              disabled={!canSaveVariant}
              className="h-14 rounded-2xl bg-ink text-base font-semibold text-paper disabled:opacity-40"
            >
              {savingVariant ? "Agregando…" : "Agregar variante"}
            </button>
          </div>
        </div>
      </dialog>

      <section aria-labelledby="lista-variantes" className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="lista-variantes" className="font-display text-xl font-semibold tracking-tight">
            Variantes ({filteredEntries.length})
          </h2>
          <button
            type="button"
            onClick={openAddDialog}
            className="h-11 shrink-0 rounded-xl bg-ink px-4 text-base font-medium text-paper"
          >
            + Agregar variante
          </button>
        </div>

        {addedNotice && (
          <p role="status" className="rounded-2xl bg-ink p-3 text-base font-medium text-paper">
            {addedNotice}
          </p>
        )}

        {groups.length === 0 ? (
          <p className="text-graphite">No hay variantes que matcheen estos filtros.</p>
        ) : (
          <div className="space-y-6">
            {groups.map(({ product, variants }) => (
              <div key={product.id} className="space-y-3">
                <ProductImageField
                  productId={product.id}
                  imageUrl={product.image_url}
                  onUploaded={(url) => patchProductInState(product.id, { image_url: url })}
                />
                <ProductNameEditor
                  productId={product.id}
                  name={product.name}
                  onSaved={(name) => patchProductInState(product.id, { name })}
                />
                <ul className="divide-y divide-rule rounded-2xl border border-rule">
                  {variants.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-sm">{v.sku}</span>
                        <span className="block text-graphite">
                          {[
                            selectedModelId === ""
                              ? v.iphone_model_id
                                ? modelNameById.get(v.iphone_model_id)
                                : "Sin modelo"
                              : null,
                            v.color,
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
              className="h-11 rounded-xl border border-ink px-4 text-base font-medium disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-graphite">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-11 rounded-xl border border-ink px-4 text-base font-medium disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
