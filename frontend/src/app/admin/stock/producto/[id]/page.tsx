"use client";

import { ChevronLeft, ImageOff, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  getAdminIphoneModels,
  getAdminProducts,
  setProductStockGroups,
  updateProduct,
  updateVariant,
  type AdminIphoneModel,
  type AdminProduct,
  type AdminVariant,
} from "@/lib/adminApi";
import AdminNotice from "../../../AdminNotice";
import {
  ADMIN_CARD,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
} from "../../../adminStyles";
import { LIBRARY_TOUCHED_PRODUCTS } from "../../../attributeLibrary";
import AddVariantDialog from "../../../catalogo/AddVariantDialog";
import { variantRules } from "../../../catalogo/addVariantRules";
import { EMPTY_DRAFT, draftChanges, type CatalogDraft } from "../../../catalogo/catalogDraft";
import ProductEditor from "../../../catalogo/ProductEditor";
import { categoryPathById, resolveCategorySettings } from "../../../categoryPath";
import { STOCK_CHANGED, settingsHint, useStockCategories } from "../../stockData";
import StockGroupsEditor from "../../StockGroupsEditor";
import BundleEditor from "./BundleEditor";
import DeleteProductDialog from "./DeleteProductDialog";
import { startNavigationProgress } from "@/components/NavigationProgress";
import AdminLoading from "../../../AdminLoading";

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
  const [deleting, setDeleting] = useState(false);
  // Variantes armadas como combo: su stock sale de sus partes y no se edita acá.
  const [bundleIds, setBundleIds] = useState<Set<string>>(new Set());
  const router = useRouter();

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
    const order = (v: AdminVariant) =>
      v.iphone_model_id === null ? Infinity : (modelOrder.get(v.iphone_model_id) ?? Infinity);
    return [...product.product_variants].sort((a, b) => {
      const byModel = order(a) - order(b);
      if (byModel) return byModel;
      return (a.color ?? "").localeCompare(b.color ?? "", "es");
    });
  }, [product, modelOrder]);

  // Modelos del producto (en el orden de la lista) y sus grupos de stock compartido.
  const productModels = useMemo(() => {
    const ids = new Set(product?.product_variants.map((v) => v.iphone_model_id).filter((id) => id !== null));
    return models.filter((m) => ids.has(m.id)).map((m) => ({ id: m.id, name: m.name }));
  }, [product, models]);
  const productGroups = useMemo(() => {
    const byGroup = new Map<number, string[]>();
    for (const link of product?.product_stock_links ?? []) {
      byGroup.set(link.group_no, [...(byGroup.get(link.group_no) ?? []), link.iphone_model_id]);
    }
    return [...byGroup.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, ids]) => [...ids].sort((a, b) => (modelOrder.get(a) ?? 0) - (modelOrder.get(b) ?? 0)));
  }, [product, modelOrder]);

  // Variantes con stock sincronizado: las del mismo color o diseño de los modelos
  // de un mismo grupo. Por cada una, las otras (ids y modelos).
  const synced = useMemo(() => {
    const groupOf = new Map((product?.product_stock_links ?? []).map((l) => [l.iphone_model_id, l.group_no]));
    const buckets = new Map<string, AdminVariant[]>();
    for (const v of product?.product_variants ?? []) {
      const group = v.iphone_model_id ? groupOf.get(v.iphone_model_id) : undefined;
      if (group === undefined) continue;
      const key = [group, v.color_id, v.motif_id, v.color].join("|");
      buckets.set(key, [...(buckets.get(key) ?? []), v]);
    }
    const map = new Map<string, { ids: string[]; models: string[] }>();
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      for (const v of bucket) {
        const others = bucket.filter((o) => o.id !== v.id);
        map.set(v.id, {
          ids: others.map((o) => o.id),
          models: others.map((o) => modelNameById.get(o.iphone_model_id ?? "") ?? "otro modelo"),
        });
      }
    }
    return map;
  }, [product, modelNameById]);

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

    // De las variantes sincronizadas se manda el stock de una sola (la base
    // mueve las otras); si a otra solo le cambiaba el stock, no se manda.
    const stockSent = new Set<string>();
    const variantPatches = changes.variants
      .map(({ id: variantId, ...patch }) => {
        const siblings = synced.get(variantId)?.ids ?? [];
        if (patch.stock_quantity !== undefined) {
          if (siblings.some((s) => stockSent.has(s))) delete patch.stock_quantity;
          else stockSent.add(variantId);
        }
        return { variantId, patch };
      })
      .filter(({ patch }) => Object.keys(patch).length > 0);
    const syncedStockChanged = [...stockSent].some((id) => synced.has(id));

    const hasProductPatch = Object.keys(changes.productPatch).length > 0;
    const [productResult, ...variantResults] = await Promise.allSettled([
      hasProductPatch ? updateProduct(product.id, changes.productPatch) : Promise.resolve(null),
      ...variantPatches.map(({ variantId, patch }) => updateVariant(variantId, patch)),
    ]);

    const failures: unknown[] = [];
    const saved = new Map<string, AdminVariant>();
    variantResults.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) saved.set(variantPatches[index].variantId, result.value.data);
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
        // Las sincronizadas con esta ya quedaron con el mismo stock.
        if (stockSent.has(variantId))
          for (const sibling of synced.get(variantId)?.ids ?? []) delete rest.stock[sibling];
      }
      return rest;
    });
    // La base movió el stock de las otras variantes del grupo: se trae de nuevo.
    if (syncedStockChanged) await refreshProducts();

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
  if (!products || !categories) return <AdminLoading />;
  if (!product) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/stock"
          className="inline-flex items-center gap-1 text-sm text-admin-muted hover:text-admin-text"
        >
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
          : "Agregar variante";
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
                {categoryPath(product.category_id)} ·{" "}
                <Link
                  href="/admin/stock/categorias"
                  title="Lo define la categoría: cambialo en Stock › Categorías"
                  className="underline decoration-dotted underline-offset-2 hover:text-admin-text"
                >
                  {settingsHint(settings.kind, rules.fixedTarget === "iphone")}
                </Link>{" "}
                ·{" "}
                {product.product_variants.length === 1 ? "1 variante" : `${product.product_variants.length} variantes`}{" "}
                · {units} unidades
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDeleting(true)}
              title="Eliminar el producto (p. ej. si se cargó dos veces)"
              className={adminButton("dangerOutline")}
            >
              <Trash2 aria-hidden="true" className="size-5" />
              Eliminar
            </button>
            <button type="button" onClick={() => setAdding(true)} className={adminButton("primary")}>
              <Plus aria-hidden="true" className="size-5" />
              {addLabel}
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}

      {deleting && (
        <DeleteProductDialog
          productId={product.id}
          productName={product.name}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            // El producto ya no está: se vuelve a su categoría y se refrescan las listas.
            window.dispatchEvent(new Event(STOCK_CHANGED));
            startNavigationProgress({ toTop: true });
            router.push(top ? `/admin/stock/${top.slug}` : "/admin/stock");
          }}
        />
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
        synced={synced}
        lockedStock={bundleIds}
      />

      {/* Combos (Accesorios › Combos): su stock sale de las partes que se eligen acá. */}
      {(categories.find((c) => c.id === product.category_id)?.slug === "combos" || bundleIds.size > 0) && (
        <BundleEditor
          // Distinta de la de ProductEditor (son hermanos): React pide claves únicas.
          key={`combo-${product.id}`}
          product={product}
          products={products}
          categoryPath={categoryPath}
          onBundleIds={setBundleIds}
          onSaved={(message) => void refreshProducts(message)}
        />
      )}

      {/* Stock compartido: solo tiene sentido con 2 o más modelos. */}
      {productModels.length >= 2 && bundleIds.size === 0 && (
        <section className={`${ADMIN_CARD} flex flex-col gap-3`}>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={ADMIN_SECTION_TITLE}>Stock compartido</h2>
              <span className={adminBadge(product.stock_groups_custom ? "warn" : "neutral")}>
                {product.stock_groups_custom ? "Excepción" : "Sigue la regla general"}
              </span>
            </div>
            <p className={ADMIN_TEXT_MUTED}>
              Modelos que usan las mismas fundas (p. ej. 13 y 14): en cada color o diseño tienen siempre el mismo stock,
              y vender, reservar o comprar uno mueve al otro.{" "}
              {product.stock_groups_custom
                ? "Este producto tiene sus propios grupos: la regla de Stock › Stock compartido no lo toca."
                : "Sale de la regla de Stock › Stock compartido. Si lo cambiás acá, este producto queda como excepción."}
            </p>
            {product.stock_groups_custom && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await setProductStockGroups(product.id, null);
                    void refreshProducts("Listo: el producto vuelve a seguir la regla general.");
                  } catch (err) {
                    setNotice(null);
                    setSaveError(errorMessage(err));
                  }
                }}
                className={`${adminButton("secondary", "sm")} self-start`}
              >
                Volver a la regla general
              </button>
            )}
          </div>
          <StockGroupsEditor
            key={JSON.stringify(productGroups)}
            models={productModels}
            initialGroups={productGroups}
            saveLabel="Guardar"
            preview={async (groups) => {
              const res = await setProductStockGroups(product.id, groups, true);
              const { changes, created } = res.data;
              const parts: string[] = [];
              if (changes.length > 0) {
                const list = changes.map((c) => `${c.sku} ${c.from} → ${c.to}`).join(", ");
                parts.push(
                  `Cada color queda con el stock más alto de sus modelos: ${changes.length === 1 ? "cambia 1 variante" : `cambian ${changes.length} variantes`} (${list}).`,
                );
              }
              if (created.length > 0) {
                const list = created.map((c) => `${c.label} ${c.model}`).join(", ");
                parts.push(`Faltaban y se crean: ${list}.`);
              }
              if (parts.length === 0) return "El stock ya coincide: no cambia nada. ¿Guardamos los grupos?";
              return `${parts.join(" ")} ¿Confirmás?`;
            }}
            apply={async (groups) => {
              await setProductStockGroups(product.id, groups);
              return groups.length === 0
                ? "Listo: en este producto cada modelo tiene su propio stock (queda como excepción)."
                : "Stock compartido guardado (este producto queda como excepción a la regla).";
            }}
            onSaved={(message) => void refreshProducts(message)}
          />
        </section>
      )}

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
