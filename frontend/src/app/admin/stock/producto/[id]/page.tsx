"use client";

import { ChevronLeft, ImageOff, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  getAdminIphoneModels,
  getAdminProducts,
  updateProduct,
  updateVariant,
  type AdminIphoneModel,
  type AdminProduct,
  type AdminVariant,
} from "@/lib/adminApi";
import AdminNotice from "../../../AdminNotice";
import { ADMIN_PAGE_TITLE, ADMIN_TEXT_MUTED, adminBadge, adminButton } from "../../../adminStyles";
import { LIBRARY_TOUCHED_PRODUCTS } from "../../../attributeLibrary";
import AddVariantDialog from "../../../catalogo/AddVariantDialog";
import { variantRules } from "../../../catalogo/addVariantRules";
import { EMPTY_DRAFT, draftChanges, type CatalogDraft } from "../../../catalogo/catalogDraft";
import ProductEditor from "../../../catalogo/ProductEditor";
import { categoryPathById, resolveCategorySettings } from "../../../categoryPath";
import { STOCK_CHANGED, settingsHint, useStockCategories } from "../../stockData";

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/** Un producto de Stock: sus colores o diseños, fotos, datos y variantes. */
export default function StockProductPage() {
  const { id } = useParams<{ id: string }>();
  const categories = useStockCategories();
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [models, setModels] = useState<AdminIphoneModel[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState<CatalogDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([getAdminProducts(), getAdminIphoneModels()])
      .then(([p, m]) => {
        if (ignore) return;
        setProducts(p.data);
        setModels([...m.data].sort((a, b) => a.sort_order - b.sort_order));
      })
      .catch((err) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : "No se pudo cargar el producto.");
      });
    // Renombrar, unir o eliminar un color o un diseño cambia las variantes.
    const onTouched = () =>
      getAdminProducts()
        .then((res) => {
          if (!ignore) setProducts(res.data);
        })
        .catch(() => {});
    window.addEventListener(LIBRARY_TOUCHED_PRODUCTS, onTouched);
    return () => {
      ignore = true;
      window.removeEventListener(LIBRARY_TOUCHED_PRODUCTS, onTouched);
    };
  }, []);

  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);
  const modelOrder = useMemo(() => new Map(models.map((m) => [m.id, m.sort_order])), [models]);
  const settingsOf = useMemo(
    () => (categories ? resolveCategorySettings(categories) : () => ({ kind: "none" as const, byModel: false })),
    [categories],
  );
  const categoryPath = useMemo(() => categoryPathById(categories ?? []), [categories]);

  const product = products?.find((p) => p.id === id);

  // Variantes ordenadas por modelo (universales al final) y después por color.
  const variants = useMemo(() => {
    if (!product) return [];
    const order = (v: AdminVariant) => (v.iphone_model_id === null ? Infinity : modelOrder.get(v.iphone_model_id) ?? Infinity);
    return [...product.product_variants].sort((a, b) => {
      const byModel = order(a) - order(b);
      if (byModel) return byModel;
      return (a.color ?? "").localeCompare(b.color ?? "", "es");
    });
  }, [product, modelOrder]);

  async function refreshProducts(message?: string) {
    if (message) setNotice(message);
    try {
      const res = await getAdminProducts();
      setProducts(res.data);
    } catch {
      // El próximo guardado lo refresca.
    }
    window.dispatchEvent(new Event(STOCK_CHANGED));
  }

  function updateDraft(update: (d: CatalogDraft) => CatalogDraft) {
    setDraft(update);
    setSaveError(null);
    setJustSaved(false);
  }

  // Guarda de una vez lo que cambió: nombre, descripción y el stock y precio de
  // cada variante tocada. Lo guardado sale del borrador; lo que falla queda.
  async function handleSave() {
    if (!product) return;
    const changes = draftChanges(product, draft);
    if (saving || changes.invalid.size > 0 || changes.count === 0) return;
    setSaving(true);
    setSaveError(null);

    const hasProductPatch = Object.keys(changes.productPatch).length > 0;
    const [productResult, ...variantResults] = await Promise.allSettled([
      hasProductPatch ? updateProduct(product.id, changes.productPatch) : Promise.resolve(null),
      ...changes.variants.map(({ id: variantId, ...patch }) => updateVariant(variantId, patch)),
    ]);

    const failures: unknown[] = [];
    const saved = new Map<string, AdminVariant>();
    variantResults.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) saved.set(changes.variants[index].id, result.value.data);
      else if (result.status === "rejected") failures.push(result.reason);
    });
    const productSaved = productResult.status === "fulfilled" ? (productResult.value?.data ?? null) : null;
    if (productResult.status === "rejected") failures.push(productResult.reason);

    setProducts((prev) =>
      (prev ?? []).map((p) =>
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

    setDraft((current) => {
      const rest: CatalogDraft = { ...current, stock: { ...current.stock }, price: { ...current.price } };
      if (productResult.status === "fulfilled") {
        delete rest.name;
        delete rest.description;
      }
      for (const variantId of saved.keys()) {
        delete rest.stock[variantId];
        delete rest.price[variantId];
      }
      return rest;
    });

    if (failures.length > 0) {
      setSaveError(
        `${failures.length === 1 ? "No se pudo guardar 1 cambio" : `No se pudieron guardar ${failures.length} cambios`}: ${errorMessage(
          failures[0],
        ).replace(/\.?$/, ".")} El resto quedó guardado.`,
      );
    } else {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    }
    setSaving(false);
    window.dispatchEvent(new Event(STOCK_CHANGED));
  }

  if (loadError) return <AdminNotice kind="danger">{loadError}</AdminNotice>;
  if (!products || !categories) return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>;
  if (!product) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/admin/stock" className="inline-flex items-center gap-1 text-sm text-admin-muted hover:text-admin-text">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Stock
        </Link>
        <p className={ADMIN_TEXT_MUTED}>Ese producto no existe.</p>
      </div>
    );
  }

  // Volver al catálogo de su categoría de tope.
  const byId = new Map(categories.map((c) => [c.id, c]));
  let top = byId.get(product.category_id);
  while (top?.parent_id) top = byId.get(top.parent_id);

  const settings = settingsOf(product.category_id);
  const rules = variantRules(product.product_variants, settings);
  const addLabel =
    rules.kind === "color"
      ? rules.fixedTarget === "iphone"
        ? "Agregar modelos o colores"
        : "Agregar colores"
      : rules.kind === "motif"
        ? rules.fixedTarget === "iphone"
          ? "Agregar modelos o diseños"
          : "Agregar diseños"
        : rules.fixedTarget === "iphone"
          ? "Agregar modelos"
          : "Agregar opción";
  const units = product.product_variants.reduce((sum, v) => sum + v.stock_quantity, 0);
  const thumb = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href={top ? `/admin/stock/${top.slug}` : "/admin/stock"}
          className="inline-flex items-center gap-1 self-start text-sm text-admin-muted hover:text-admin-text"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {top?.name ?? "Stock"}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa (Storage), igual que la galería.
                <img src={thumb} alt="" className="size-full object-cover" />
              ) : (
                <ImageOff aria-hidden="true" className="size-5 text-admin-muted" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`${ADMIN_PAGE_TITLE} break-words`}>{product.name}</h1>
                {!product.active && <span className={adminBadge("neutral")}>Oculto en la web</span>}
              </div>
              <p className="mt-0.5 text-sm text-admin-muted">
                {categoryPath(product.category_id)} · {settingsHint(settings.kind, rules.fixedTarget === "iphone")} ·{" "}
                {product.product_variants.length === 1 ? "1 variante" : `${product.product_variants.length} variantes`} ·{" "}
                {units} unidades
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setAdding(true)} className={adminButton("primary")}>
            <Plus aria-hidden="true" className="size-5" />
            {addLabel}
          </button>
        </div>
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}

      <ProductEditor
        key={product.id}
        product={product}
        variants={variants}
        draft={draft}
        onDraftChange={updateDraft}
        modelNameById={modelNameById}
        onVariantsChanged={(message) => void refreshProducts(message)}
        saving={saving}
        error={saveError}
        justSaved={justSaved}
        onSave={handleSave}
        onDiscard={() => {
          setDraft(EMPTY_DRAFT);
          setSaveError(null);
        }}
        onImagesChange={(images) =>
          setProducts((prev) => (prev ?? []).map((p) => (p.id === product.id ? { ...p, product_images: images } : p)))
        }
        onAddVariant={() => setAdding(true)}
        addLabel={addLabel}
      />

      {adding && (
        <AddVariantDialog
          products={products}
          models={models}
          settingsOf={settingsOf}
          categoryPath={categoryPath}
          presetProductId={product.id}
          onClose={() => setAdding(false)}
          onAdded={(message) => void refreshProducts(message)}
        />
      )}
    </div>
  );
}
