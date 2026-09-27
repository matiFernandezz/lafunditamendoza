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
import {
  ADMIN_ALERT_ERROR,
  ADMIN_ALERT_OK,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_TITLE,
  ADMIN_ROW_LIST,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
  ADMIN_TEXT_MUTED,
} from "../adminStyles";
import { displayColor } from "../ventas/utils";
import Combobox from "./Combobox";
import { suggestSku } from "./sku";

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
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className={ADMIN_PAGE_TITLE}>Productos</h1>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="nuevo-producto" className={`${ADMIN_CARD} space-y-4`}>
          <h2 id="nuevo-producto" className={ADMIN_SECTION_TITLE}>
            Nuevo producto
          </h2>

          <div>
            <label htmlFor="producto-nombre" className={ADMIN_LABEL}>
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
              className={ADMIN_INPUT}
            />
          </div>

          <div>
            <label htmlFor="producto-descripcion" className={ADMIN_LABEL}>
              Descripción (opcional)
            </label>
            <textarea
              id="producto-descripcion"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`min-h-24 ${ADMIN_TEXTAREA}`}
            />
          </div>

          <div>
            <label htmlFor="producto-categoria" className={ADMIN_LABEL}>
              Categoría
            </label>
            <select
              id="producto-categoria"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setProductError(null);
              }}
              className={ADMIN_INPUT}
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

          {productError && <p role="alert" className={ADMIN_ALERT_ERROR}>{productError}</p>}
          {productOk && <p role="status" className={ADMIN_ALERT_OK}>{productOk}</p>}

          <button
            type="button"
            onClick={handleCreateProduct}
            disabled={!canSaveProduct}
            className={`${ADMIN_BUTTON_PRIMARY} w-full`}
          >
            {savingProduct ? "Creando…" : "Crear producto"}
          </button>
        </section>

        <section
          ref={variantSectionRef}
          aria-labelledby="agregar-variante"
          className={`${ADMIN_CARD} scroll-mt-20 space-y-4`}
        >
          <h2 id="agregar-variante" className={ADMIN_SECTION_TITLE}>
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
            <label htmlFor="variante-modelo" className={ADMIN_LABEL}>
              Modelo de iPhone
            </label>
            <select
              id="variante-modelo"
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value);
                setVariantError(null);
              }}
              className={ADMIN_INPUT}
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
            <label htmlFor="variante-color" className={ADMIN_LABEL}>
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
              className={ADMIN_INPUT}
            />
          </div>

          <div>
            <label htmlFor="variante-sku" className={ADMIN_LABEL}>
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
              <label htmlFor="variante-precio" className={ADMIN_LABEL}>
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
                className={`${ADMIN_INPUT} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="variante-stock" className={ADMIN_LABEL}>
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
                className={`${ADMIN_INPUT} font-mono`}
              />
            </div>
          </div>

          {variantError && <p role="alert" className={ADMIN_ALERT_ERROR}>{variantError}</p>}
          {variantOk && <p role="status" className={ADMIN_ALERT_OK}>{variantOk}</p>}

          <button
            type="button"
            onClick={handleCreateVariant}
            disabled={!canSaveVariant}
            className={`${ADMIN_BUTTON_PRIMARY} w-full`}
          >
            {savingVariant ? "Agregando…" : "Agregar variante"}
          </button>

          {selectedProduct && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-admin-text">
                Variantes de {selectedProduct.name} ({selectedProduct.product_variants.length})
              </h3>
              {selectedProduct.product_variants.length === 0 ? (
                <p className={ADMIN_TEXT_MUTED}>Todavía no tiene variantes.</p>
              ) : (
                <ul className={ADMIN_ROW_LIST}>
                  {selectedProduct.product_variants.map((v) => (
                    <li key={v.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block font-mono text-xs text-admin-muted">{v.sku}</span>
                        <span className="mt-0.5 block text-sm text-admin-text">
                          {[
                            v.iphone_model_id ? modelNamesById.get(v.iphone_model_id) : "Todos los modelos",
                            displayColor(v.color),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm tabular-nums">
                        <span className="block font-mono text-admin-text">{formatPrice(v.price)}</span>
                        <span className={ADMIN_TEXT_MUTED}>Stock {v.stock_quantity}</span>
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
