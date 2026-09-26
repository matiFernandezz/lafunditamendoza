"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminApiError,
  createProduct,
  createProductVariant,
  getAdminCategories,
  getAdminIphoneModels,
  getAdminProducts,
  type AdminCategory,
  type AdminIphoneModel,
  type AdminProduct,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import Combobox from "./Combobox";
import { suggestSku } from "./sku";

const inputClass =
  "h-14 w-full rounded-2xl border border-graphite bg-transparent px-4 text-base";

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

export default function ProductosPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [models, setModels] = useState<AdminIphoneModel[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Formulario de producto
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productOk, setProductOk] = useState<string | null>(null);

  // Formulario de variante (producto, modelo, precio y stock se conservan entre variantes)
  const [productId, setProductId] = useState("");
  const [modelId, setModelId] = useState("");
  const [color, setColor] = useState("");
  const [skuOverride, setSkuOverride] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [savingVariant, setSavingVariant] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [variantOk, setVariantOk] = useState<string | null>(null);

  const variantSectionRef = useRef<HTMLElement>(null);

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

  // Categorías con jerarquía. Solo se pueden elegir las hojas: el catálogo público
  // muestra productos de subcategorías, no de una categoría que tiene hijas.
  const categoryOptions = useMemo(() => {
    const parents = categories
      .filter((c) => c.parent_id === null)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return parents.map((parent) => ({
      parent,
      children: categories
        .filter((c) => c.parent_id === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    }));
  }, [categories]);

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

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedModel = models.find((m) => m.id === modelId);
  const modelNamesById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  const suggestedSku = suggestSku(selectedProduct?.name ?? "", selectedModel?.name ?? "", color);
  const sku = skuOverride ?? suggestedSku;

  const priceNumber = Number(price);
  const stockNumber = stock.trim() === "" ? 0 : Number(stock);
  const priceValid = price.trim() !== "" && Number.isFinite(priceNumber) && priceNumber > 0;
  const stockValid = Number.isInteger(stockNumber) && stockNumber >= 0;
  const canSaveVariant =
    !savingVariant && productId !== "" && sku.trim() !== "" && priceValid && stockValid;
  const canSaveProduct = !savingProduct && name.trim() !== "" && categoryId !== "";

  async function handleCreateProduct() {
    if (!canSaveProduct) return;
    setSavingProduct(true);
    setProductError(null);
    setProductOk(null);
    try {
      const res = await createProduct({
        category_id: categoryId,
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setProductOk(`Producto "${res.data.name}" creado. Ahora agregale variantes.`);
      setName("");
      setDescription("");
      setProductId(res.data.id);
      setSkuOverride(null);
      setVariantError(null);
      setVariantOk(null);
      await refreshProducts();
      variantSectionRef.current?.scrollIntoView({ block: "start" });
    } catch (err) {
      setProductError(errorMessage(err));
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleCreateVariant() {
    if (!canSaveVariant) return;
    setSavingVariant(true);
    setVariantError(null);
    setVariantOk(null);
    try {
      const res = await createProductVariant({
        product_id: productId,
        iphone_model_id: modelId === "" ? null : modelId,
        ...(color.trim() ? { color: color.trim() } : {}),
        sku: sku.trim(),
        price: priceNumber,
        stock_quantity: stockNumber,
      });
      setVariantOk(`Variante ${res.data.sku} agregada.`);
      // Listo para la siguiente variante del mismo producto: se limpia solo color y SKU.
      setColor("");
      setSkuOverride(null);
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
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Productos</h1>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
        <section aria-labelledby="nuevo-producto" className="space-y-4">
          <h2 id="nuevo-producto" className="font-display text-xl font-semibold tracking-tight">
            Nuevo producto
          </h2>

          <div>
            <label htmlFor="producto-nombre" className="mb-1 block text-base font-medium">
              Nombre
            </label>
            <input
              id="producto-nombre"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setProductError(null);
                setProductOk(null);
              }}
              placeholder="Funda de silicona degradé"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="producto-descripcion" className="mb-1 block text-base font-medium">
              Descripción (opcional)
            </label>
            <textarea
              id="producto-descripcion"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="min-h-24 w-full rounded-2xl border border-graphite bg-transparent p-4 text-base"
            />
          </div>

          <div>
            <label htmlFor="producto-categoria" className="mb-1 block text-base font-medium">
              Categoría
            </label>
            <select
              id="producto-categoria"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setProductError(null);
              }}
              className={inputClass}
            >
              <option value="">Elegí una categoría</option>
              {categoryOptions.map(({ parent, children }) =>
                children.length > 0 ? (
                  <optgroup key={parent.id} label={parent.name}>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {parent.name} &gt; {child.name}
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

          {productError && (
            <p role="alert" className="rounded-2xl border border-ink p-3 text-base font-medium">
              {productError}
            </p>
          )}
          {productOk && (
            <p role="status" className="rounded-2xl bg-ink p-3 text-base font-medium text-paper">
              {productOk}
            </p>
          )}

          <button
            type="button"
            onClick={handleCreateProduct}
            disabled={!canSaveProduct}
            className="h-14 w-full rounded-2xl bg-ink text-base font-semibold text-paper disabled:opacity-40"
          >
            {savingProduct ? "Creando…" : "Crear producto"}
          </button>
        </section>

        <section
          ref={variantSectionRef}
          aria-labelledby="agregar-variante"
          className="scroll-mt-20 space-y-4"
        >
          <h2 id="agregar-variante" className="font-display text-xl font-semibold tracking-tight">
            Agregar variante
          </h2>

          <Combobox
            id="variante-producto"
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
              setVariantOk(null);
            }}
          />

          <div>
            <label htmlFor="variante-modelo" className="mb-1 block text-base font-medium">
              Modelo de iPhone
            </label>
            <select
              id="variante-modelo"
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value);
                setVariantError(null);
              }}
              className={inputClass}
            >
              <option value="">No aplica / todos los modelos</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="variante-color" className="mb-1 block text-base font-medium">
              Color (opcional)
            </label>
            <input
              id="variante-color"
              type="text"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setVariantError(null);
                setVariantOk(null);
              }}
              placeholder="rojo"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="variante-sku" className="mb-1 block text-base font-medium">
              SKU
            </label>
            <input
              id="variante-sku"
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
              <label htmlFor="variante-precio" className="mb-1 block text-base font-medium">
                Precio
              </label>
              <input
                id="variante-precio"
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
              <label htmlFor="variante-stock" className="mb-1 block text-base font-medium">
                Stock inicial
              </label>
              <input
                id="variante-stock"
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
          {variantOk && (
            <p role="status" className="rounded-2xl bg-ink p-3 text-base font-medium text-paper">
              {variantOk}
            </p>
          )}

          <button
            type="button"
            onClick={handleCreateVariant}
            disabled={!canSaveVariant}
            className="h-14 w-full rounded-2xl bg-ink text-base font-semibold text-paper disabled:opacity-40"
          >
            {savingVariant ? "Agregando…" : "Agregar variante"}
          </button>

          {selectedProduct && (
            <div className="space-y-2 pt-2">
              <h3 className="text-base font-semibold">
                Variantes de {selectedProduct.name} ({selectedProduct.product_variants.length})
              </h3>
              {selectedProduct.product_variants.length === 0 ? (
                <p className="text-graphite">Todavía no tiene variantes.</p>
              ) : (
                <ul className="divide-y divide-rule rounded-2xl border border-rule">
                  {selectedProduct.product_variants.map((v) => (
                    <li key={v.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block font-mono text-sm">{v.sku}</span>
                        <span className="block text-graphite">
                          {[v.iphone_model_id ? modelNamesById.get(v.iphone_model_id) : "Todos los modelos", v.color]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm tabular-nums">
                        <span className="block font-mono">{formatPrice(v.price)}</span>
                        <span className="block text-graphite">Stock {v.stock_quantity}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
