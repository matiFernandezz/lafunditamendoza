"use client";

import { PackageCheck, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  addProductImage,
  createPurchaseGrid,
  getAdminCategories,
  getAdminIphoneModels,
  getAdminProducts,
  getLastPurchaseCosts,
  getSuppliers,
  type AdminCategory,
  type AdminIphoneModel,
  type AdminProduct,
  type LastPurchaseCost,
  type Supplier,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../AdminNotice";
import { categoryPathById } from "../categoryPath";
import {
  ADMIN_CAP,
  ADMIN_CARD,
  ADMIN_EMPTY,
  ADMIN_LABEL,
  ADMIN_NAME,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_ROW_LIST,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminIconButton,
  adminInput,
} from "../adminStyles";
import ProductDraftForm from "../productos/ProductDraftForm";
import { assignSkus, emptyDraft, nextKey, releasePhotos } from "../productos/productDraft";
import PurchaseBlock from "./PurchaseBlock";
import SupplierField from "./SupplierField";
import {
  UNIVERSAL,
  buildPurchasePayload,
  formatArDate,
  indexLastCosts,
  maskArDate,
  productPrevCost,
  summarize,
  validatePurchase,
  variantPrevCost,
  type ExistingBlock,
  type PurchaseBlock as Block,
} from "./purchaseLogic";

const MAX_RESULTS = 8;

async function loadData() {
  const [suppliers, products, models, categories, lastCosts] = await Promise.all([
    getSuppliers(),
    getAdminProducts(),
    getAdminIphoneModels(),
    getAdminCategories(),
    getLastPurchaseCosts(),
  ]);
  return {
    suppliers: suppliers.data,
    products: products.data,
    models: [...models.data].sort((a, b) => a.sort_order - b.sort_order),
    categories: categories.data,
    lastCosts: lastCosts.data,
  };
}

type Data = Awaited<ReturnType<typeof loadData>>;

export default function ComprasPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [models, setModels] = useState<AdminIphoneModel[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [lastCosts, setLastCosts] = useState<LastPurchaseCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(() => formatArDate(new Date()));
  const [search, setSearch] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ text: string; warning: string | null } | null>(null);

  function applyData(data: Data) {
    setSuppliers(data.suppliers);
    setProducts(data.products);
    setModels(data.models);
    setCategories(data.categories);
    setLastCosts(data.lastCosts);
  }

  useEffect(() => {
    let ignore = false;

    loadData()
      .then((data) => {
        if (ignore) return;
        applyData(data);
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
      .then(applyData)
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
      })
      .finally(() => setLoading(false));
  }

  async function refresh() {
    try {
      const data = await loadData();
      applyData(data);
      return data;
    } catch {
      return null;
    }
  }

  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);
  const modelOrderById = useMemo(() => new Map(models.map((m) => [m.id, m.sort_order])), [models]);
  const categoryPath = useMemo(() => categoryPathById(categories), [categories]);
  const costIndex = useMemo(() => indexLastCosts(lastCosts), [lastCosts]);

  // SKU de cada variante nueva (de productos nuevos o de "Agregar modelo"), sin
  // repetir ninguno existente ni entre los bloques de esta compra.
  const skuByKey = useMemo(() => {
    const taken = new Set(products.flatMap((p) => p.product_variants.map((v) => v.sku)));
    const result = new Map<string, string>();
    for (const block of blocks) {
      if (block.kind === "new") {
        assignSkus(block.draft.name, block.draft.rows, taken, modelNameById, result);
      } else {
        assignSkus(block.name, block.rows.filter((row) => row.variantId === null), taken, modelNameById, result);
      }
    }
    return result;
  }, [blocks, products, modelNameById]);

  const form = { supplierId, date, blocks };
  const validation = useMemo(
    () => validatePurchase({ supplierId, date, blocks }, products.map((p) => p.name)),
    [supplierId, date, blocks, products],
  );
  const summary = summarize(blocks);

  const canSubmit = !submitting && validation.message === null;

  // El proveedor y la fecha recién se marcan en rojo cuando ya hay algo
  // cargado: al abrir la pantalla vacía no hay nada que reclamar todavía.
  const started = blocks.length > 0;

  function touch() {
    setServerError(null);
    setSuccess(null);
  }

  function updateBlock(key: string, update: (block: Block) => Block) {
    touch();
    setBlocks((prev) => prev.map((block) => (block.key === key ? update(block) : block)));
  }

  function removeBlock(block: Block) {
    touch();
    if (block.kind === "new") releasePhotos(block.draft.photos);
    setBlocks((prev) => prev.filter((b) => b.key !== block.key));
  }

  // Precarga todas las variantes del producto con la cantidad vacía.
  function addProduct(product: AdminProduct) {
    touch();
    setSearch("");
    const order = (modelId: string | null) => (modelId === null ? Infinity : modelOrderById.get(modelId) ?? Infinity);
    const variants = [...product.product_variants].sort((a, b) => {
      const byModel = order(a.iphone_model_id) - order(b.iphone_model_id);
      // Infinity - Infinity es NaN: dos variantes sin modelo empatan.
      if (byModel) return byModel;
      return (a.color ?? "").localeCompare(b.color ?? "", "es");
    });
    const prevCost = productPrevCost(product.id, product.product_variants, costIndex);
    const block: ExistingBlock = {
      kind: "existing",
      key: nextKey(),
      productId: product.id,
      name: product.name,
      // Arranca con el último costo: si no cambió, solo hay que cargar cantidades.
      bulkCost: prevCost !== null ? String(prevCost) : "",
      newSalePrice: "",
      productPrevCost: prevCost,
      attrKind: product.product_variants.some((v) => v.active && v.motif_id !== null) ? "motif" : "color",
      rows: variants.map((v) => ({
        key: v.id,
        variantId: v.id,
        modelId: v.iphone_model_id ?? UNIVERSAL,
        color: v.color ?? "",
        quantity: "",
        cost: "",
        costTouched: false,
        currentStock: v.stock_quantity,
        currentPrice: v.price,
        prevCost: variantPrevCost(v, costIndex),
        sku: v.sku,
      })),
    };
    setBlocks((prev) => [...prev, block]);
  }

  function addNewProduct(name: string) {
    touch();
    setSearch("");
    setBlocks((prev) => [...prev, { kind: "new", key: nextKey(), draft: emptyDraft(name) }]);
  }

  const searchText = search.trim();
  const results = useMemo(() => {
    const tokens = searchText.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return products
      .filter((p) => tokens.every((t) => p.name.toLowerCase().includes(t)))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [products, searchText]);
  const exactMatch = products.some((p) => p.name.trim().toLowerCase() === searchText.toLowerCase());
  const inPurchase = new Set(blocks.flatMap((b) => (b.kind === "existing" ? [b.productId] : [])));

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setServerError(null);
    setSuccess(null);

    try {
      const { payload, blockKeys } = buildPurchasePayload(form, skuByKey);
      const res = await createPurchaseGrid(payload);

      // Las fotos van después: Storage no entra en la transacción de la compra.
      const photoFailures: string[] = [];
      for (const createdProduct of res.data.created_products) {
        const block = blocks.find((b) => b.key === blockKeys[createdProduct.block]);
        if (block?.kind !== "new") continue;
        let failed = 0;
        for (const photo of block.draft.photos) {
          try {
            await addProductImage(createdProduct.id, photo.file);
          } catch {
            failed += 1;
          }
        }
        if (failed > 0) photoFailures.push(`${failed === 1 ? "1 foto" : `${failed} fotos`} de “${createdProduct.name}”`);
      }

      const supplierName = suppliers.find((s) => s.id === supplierId)?.name;
      const extras = [
        res.data.created_products.length > 0 &&
          (res.data.created_products.length === 1
            ? "se creó 1 producto nuevo"
            : `se crearon ${res.data.created_products.length} productos nuevos`),
        res.data.updated_prices > 0 &&
          (res.data.updated_prices === 1
            ? "se actualizó el precio de 1 modelo"
            : `se actualizó el precio de ${res.data.updated_prices} modelos`),
      ].filter(Boolean);
      setSuccess({
        text: `Compra registrada${supplierName ? ` · ${supplierName}` : ""} · ${formatPrice(res.data.total_amount)} · se ${
          summary.units === 1 ? "sumó 1 unidad" : `sumaron ${summary.units} unidades`
        } al stock${extras.length > 0 ? ` · ${extras.join(" · ")}` : ""}.`,
        warning:
          photoFailures.length > 0
            ? `No se pudieron subir ${photoFailures.join(" y ")}. Sumalas desde Catálogo.`
            : null,
      });

      for (const block of blocks) if (block.kind === "new") releasePhotos(block.draft.photos);
      setBlocks([]);
      setSupplierId("");
      setDate(formatArDate(new Date()));
      setSearch("");
      window.scrollTo({ top: 0 });
      await refresh();
    } catch (err) {
      setServerError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
      // Si el proveedor ya no existe, lo sacamos de la selección; los bloques quedan.
      const fresh = await refresh();
      if (fresh && !fresh.suppliers.some((s) => s.id === supplierId)) setSupplierId("");
    } finally {
      setSubmitting(false);
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

  const dateInvalid = validation.invalid.has("date");
  // Un solo aviso: lo que rechazó el servidor o, si no, lo primero que falta.
  const notice = serverError ?? validation.message;

  const summaryCard = (
    <div className={`${ADMIN_CARD} flex flex-col gap-2.5 lg:p-5`}>
      <SummaryRow label="Productos" value={String(summary.products)} />
      <SummaryRow label="Unidades que entran" value={String(summary.units)} />
      <div className="my-0.5 border-t border-admin-border" />
      <div className="flex items-baseline justify-between gap-3">
        <span className={ADMIN_CAP}>Costo total</span>
        <span className="font-mono text-[28px] font-bold tabular-nums text-admin-text">
          {formatPrice(summary.total)}
        </span>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`${adminButton("primary", "lg")} mt-1.5 w-full`}
      >
        <PackageCheck aria-hidden="true" className="size-[22px]" />
        {submitting ? "Registrando…" : "Registrar compra"}
      </button>
      {notice && !submitting && (
        <p
          role={serverError ? "alert" : "status"}
          className={`text-center text-[13px] ${
            serverError || started ? "font-medium text-admin-danger" : "text-admin-muted"
          }`}
        >
          {notice}
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Cargar compra</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          Elegí un producto y cargá las cantidades de todos sus modelos. Se suma al stock.
        </p>
      </div>

      {success && (
        <AdminNotice kind="ok" onClose={() => setSuccess(null)}>
          {success.text}
        </AdminNotice>
      )}
      {success?.warning && <AdminNotice kind="danger">{success.warning}</AdminNotice>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <SupplierField
              suppliers={suppliers}
              value={supplierId}
              invalid={started && validation.invalid.has("supplier")}
              onChange={(id) => {
                touch();
                setSupplierId(id);
              }}
              onCreated={(supplier) => {
                touch();
                setSuppliers((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name, "es")));
                setSupplierId(supplier.id);
              }}
            />
            <div>
              <label htmlFor="fecha" className={ADMIN_LABEL}>
                Fecha <span className="font-normal text-admin-muted">(dd/mm/aaaa)</span>
              </label>
              <input
                id="fecha"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={date}
                aria-invalid={dateInvalid || undefined}
                onChange={(e) => {
                  touch();
                  setDate(maskArDate(e.target.value));
                }}
                placeholder="dd/mm/aaaa"
                className={adminInput({ mono: true, state: dateInvalid ? "error" : null })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="buscar" className="block text-sm font-semibold text-admin-text">
              Productos que entran
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-admin-muted"
              />
              <input
                id="buscar"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar un producto para agregar: Estelar, MagCase…"
                className={adminInput({ prefix: "icon" })}
              />
            </div>

            {searchText !== "" && (
              <ul className={ADMIN_ROW_LIST}>
                {results.slice(0, MAX_RESULTS).map((product) => {
                  const added = inPurchase.has(product.id);
                  const stock = product.product_variants.reduce((sum, v) => sum + v.stock_quantity, 0);
                  const count = product.product_variants.length;
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        disabled={added}
                        className="flex min-h-14 w-full items-center gap-3 py-2 pl-4 pr-3 text-left transition-colors duration-200 hover:bg-admin-bg disabled:hover:bg-white"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-[15px] font-semibold text-admin-text">
                            {product.name}
                          </span>
                          <span className={`block break-words ${ADMIN_TEXT_MUTED}`}>
                            {categoryPath(product.category_id)} · {count === 1 ? "1 variante" : `${count} variantes`} ·
                            stock {stock}
                          </span>
                        </span>
                        {added ? (
                          <span className={adminBadge("neutral")}>En la compra</span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-admin-ink text-white"
                          >
                            <Plus className="size-5" strokeWidth={2.2} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {!exactMatch && (
                  <li>
                    <button
                      type="button"
                      onClick={() => addNewProduct(searchText)}
                      className="flex min-h-14 w-full items-center gap-3 py-2 pl-4 pr-3 text-left transition-colors duration-200 hover:bg-admin-bg"
                    >
                      <span className="min-w-0 flex-1 break-words text-[15px] font-semibold text-admin-text">
                        Crear producto nuevo «{searchText}»
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-admin-border-strong text-admin-text"
                      >
                        <PackagePlus className="size-5" />
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            )}
            {results.length > MAX_RESULTS && (
              <p className={ADMIN_TEXT_MUTED}>
                Mostrando {MAX_RESULTS} de {results.length}. Afiná la búsqueda para ver el resto.
              </p>
            )}
          </div>

          {blocks.length === 0 ? (
            <p className={ADMIN_EMPTY}>Buscá y agregá los productos de esta compra.</p>
          ) : (
            blocks.map((block) =>
              block.kind === "existing" ? (
                <PurchaseBlock
                  key={block.key}
                  block={block}
                  onChange={(update) => updateBlock(block.key, (b) => (b.kind === "existing" ? update(b) : b))}
                  onRemove={() => removeBlock(block)}
                  models={models}
                  skuByKey={skuByKey}
                  invalid={validation.invalid}
                  disabled={submitting}
                />
              ) : (
                <section
                  key={block.key}
                  aria-label={`Producto nuevo ${block.draft.name}`}
                  className={`${ADMIN_CARD} flex flex-col gap-4 lg:p-5`}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className={`flex flex-wrap items-center gap-2 break-words ${ADMIN_NAME}`}>
                        {block.draft.name.trim() || "Producto nuevo"}
                        <span className={adminBadge("ink")}>Nuevo</span>
                      </h2>
                      <p className={`mt-0.5 ${ADMIN_TEXT_MUTED}`}>
                        Se crea al registrar la compra. Solo entran los modelos con cantidad.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock(block)}
                      disabled={submitting}
                      aria-label="Quitar el producto nuevo de la compra"
                      title="Quitar de la compra"
                      className={adminIconButton("danger")}
                    >
                      <Trash2 aria-hidden="true" className="size-[18px]" />
                    </button>
                  </div>
                  <ProductDraftForm
                    idPrefix={`nuevo-${block.key}`}
                    fieldKey={block.key}
                    purchase
                    draft={block.draft}
                    onChange={(update) =>
                      updateBlock(block.key, (b) => (b.kind === "new" ? { ...b, draft: update(b.draft) } : b))
                    }
                    categories={categories}
                    models={models}
                    skuByKey={skuByKey}
                    invalid={validation.invalid}
                    disabled={submitting}
                  />
                </section>
              ),
            )
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-8">{summaryCard}</aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[15px] text-admin-text">
      <span>{label}</span>
      <span className="font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}
