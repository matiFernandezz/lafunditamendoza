"use client";

import { ChevronRight, ImageOff, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  getAdminIphoneModels,
  getAdminProducts,
  type AdminIphoneModel,
  type AdminProduct,
} from "@/lib/adminApi";
import { formatPriceRange } from "@/lib/format";
import { colorsWithoutPhotos, motifsWithoutPhotos } from "@/lib/productColors";
import AdminNotice from "../../AdminNotice";
import {
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminInput,
} from "../../adminStyles";
import { LIBRARY_TOUCHED_PRODUCTS } from "../../attributeLibrary";
import CategoryColors from "../../catalogo/CategoryColors";
import { categorySubtree, resolveCategorySettings } from "../../categoryPath";
import PeriodSwitch from "../../PeriodSwitch";
import { STOCK_CHANGED, settingsHint, topCategories, useStockCategories } from "../stockData";

const UNIVERSAL = "__universal__";

type StockFilter = "all" | "positive" | "zero";
const STOCK_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "positive", label: "Con stock" },
  { value: "zero", label: "Sin stock" },
] as const satisfies readonly { value: StockFilter; label: string }[];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Catálogo de una categoría de tope (Fundas, Accesorios): un renglón por
 * producto con su stock; tocarlo abre el producto. Filtros por tipo, por
 * modelo de iPhone (si la categoría va por modelo) y por stock.
 */
// useSearchParams necesita un Suspense alrededor para el render del servidor.
export default function StockCategoryPage() {
  return (
    <Suspense fallback={<p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>}>
      <StockCategory />
    </Suspense>
  );
}

function StockCategory() {
  const { slug } = useParams<{ slug: string }>();
  // ?tipo=<id>: llega desde Categorías con un tipo ya elegido.
  const tipo = useSearchParams().get("tipo") ?? "";
  const categories = useStockCategories();
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [models, setModels] = useState<AdminIphoneModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [childId, setChildId] = useState(tipo);
  const [modelId, setModelId] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([getAdminProducts(), getAdminIphoneModels()])
      .then(([p, m]) => {
        if (ignore) return;
        setProducts(p.data);
        setModels([...m.data].sort((a, b) => a.sort_order - b.sort_order));
        setError(null);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudo cargar el stock.");
      });
    // Renombrar o unir colores (y cualquier cambio de stock) cambia las variantes.
    const refresh = () => setReload((n) => n + 1);
    window.addEventListener(LIBRARY_TOUCHED_PRODUCTS, refresh);
    window.addEventListener(STOCK_CHANGED, refresh);
    return () => {
      ignore = true;
      window.removeEventListener(LIBRARY_TOUCHED_PRODUCTS, refresh);
      window.removeEventListener(STOCK_CHANGED, refresh);
    };
  }, [reload]);

  const top = categories ? topCategories(categories).find((c) => c.slug === slug) : undefined;
  const children = useMemo(
    () =>
      top && categories
        ? categories
            .filter((c) => c.parent_id === top.id)
            .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"))
        : [],
    [top, categories],
  );
  const settings = useMemo(() => (categories ? resolveCategorySettings(categories) : null), [categories]);
  const nameById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c.name])), [categories]);
  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  // Cambiar de categoría de tope (otra entrada del menú) limpia los filtros.
  const [prevKey, setPrevKey] = useState(`${slug}|${tipo}`);
  if (prevKey !== `${slug}|${tipo}`) {
    setPrevKey(`${slug}|${tipo}`);
    setChildId(tipo);
    setModelId("");
    setStockFilter("all");
    setSearch("");
  }

  const rows = useMemo(() => {
    if (!top || !categories || !products) return [];
    const scope = categorySubtree(categories, childId || top.id);
    const term = fold(search.trim());
    return products
      .filter((p) => scope.has(p.category_id))
      .filter((p) => term === "" || fold(p.name).includes(term))
      .map((product) => {
        const variants = product.product_variants.filter(
          (v) => modelId === "" || (modelId === UNIVERSAL ? v.iphone_model_id === null : v.iphone_model_id === modelId),
        );
        const units = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
        return { product, variants, units, empty: variants.filter((v) => v.stock_quantity === 0).length };
      })
      .filter((r) => modelId === "" || r.variants.length > 0)
      .filter((r) => stockFilter === "all" || (stockFilter === "zero" ? r.units === 0 : r.units > 0))
      .sort((a, b) => a.product.name.localeCompare(b.product.name, "es"));
  }, [top, categories, products, childId, modelId, stockFilter, search]);

  if (error) return <AdminNotice kind="danger">{error}</AdminNotice>;
  if (!categories || !products) return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>;
  if (!top) return <p className={ADMIN_EMPTY}>Esa categoría no existe.</p>;

  const byModel = [top, ...children].some((c) => settings?.(c.id).byModel);
  const selectedChild = children.find((c) => c.id === childId);
  const colorScope = selectedChild ?? top;
  const usesColors = settings?.(colorScope.id).kind === "color";
  const totalUnits = rows.reduce((sum, r) => sum + r.units, 0);
  const modelName = modelId === UNIVERSAL ? "Universales" : modelNameById.get(modelId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>{top.name}</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            {rows.length === 1 ? "1 producto" : `${rows.length} productos`} · {totalUnits} unidades
            {modelName && ` para ${modelName}`}
          </p>
        </div>
        <Link href={`/admin/stock/nuevo?categoria=${colorScope.id}`} className={adminButton("primary")}>
          <Plus aria-hidden="true" className="size-5" />
          Nuevo producto
        </Link>
      </div>

      {children.length > 0 && (
        <div role="radiogroup" aria-label="Tipo" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {[{ id: "", name: "Todos" }, ...children].map((c) => {
            const active = childId === c.id;
            const s = c.id ? settings?.(c.id) : null;
            return (
              <button
                key={c.id || "todos"}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setChildId(c.id)}
                title={s ? settingsHint(s.kind, s.byModel) : undefined}
                className={`h-10 shrink-0 whitespace-nowrap rounded-md px-3.5 text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? "bg-admin-ink text-admin-on-ink"
                    : "border border-admin-border bg-admin-surface text-admin-text hover:border-admin-border-strong"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
        <div className="relative">
          <label htmlFor="stock-buscar" className="sr-only">
            Buscar producto
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-admin-muted"
          />
          <input
            id="stock-buscar"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar en ${top.name.toLowerCase()}…`}
            className={adminInput({ prefix: "icon" })}
          />
        </div>
        {byModel ? (
          <div>
            <label htmlFor="stock-modelo" className="sr-only">
              Modelo de iPhone
            </label>
            <select id="stock-modelo" value={modelId} onChange={(e) => setModelId(e.target.value)} className={ADMIN_INPUT}>
              <option value="">Todos los modelos</option>
              <option value={UNIVERSAL}>Universales</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="hidden xl:block" />
        )}
        <PeriodSwitch label="Stock" options={STOCK_FILTERS} value={stockFilter} onChange={setStockFilter} />
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}

      {rows.length === 0 ? (
        <p className={ADMIN_EMPTY}>No hay productos con esos filtros.</p>
      ) : (
        <ul className="divide-y divide-admin-border overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
          {rows.map(({ product, variants, units, empty }) => {
            const thumb = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
            const missingPhotos =
              colorsWithoutPhotos(product.product_variants, product.product_images).length +
              motifsWithoutPhotos(product.product_variants, product.product_images).length;
            return (
              <li key={product.id}>
                <Link
                  href={`/admin/stock/producto/${product.id}`}
                  className="flex min-h-[68px] items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-admin-bg"
                >
                  <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-admin-border bg-admin-bg">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa (Storage), igual que la galería.
                      <img src={thumb} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff aria-hidden="true" className="size-5 text-admin-muted" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold text-admin-text">
                      <span className="truncate">{product.name}</span>
                      {!product.active && <span className={adminBadge("neutral")}>Oculto</span>}
                      {product.product_images.length === 0 ? (
                        <span className={adminBadge("warn")}>Sin foto</span>
                      ) : (
                        missingPhotos > 0 && <span className={adminBadge("warn")}>Faltan fotos</span>
                      )}
                    </span>
                    <span className={`block truncate ${ADMIN_TEXT_MUTED}`}>
                      {!childId && children.length > 0 && `${nameById.get(product.category_id) ?? ""} · `}
                      {variants.length === 1 ? "1 variante" : `${variants.length} variantes`}
                      {empty > 0 && <span className="font-semibold text-admin-danger"> · {empty} sin stock</span>}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="block font-mono text-sm tabular-nums text-admin-muted">
                      {variants.length > 0 ? formatPriceRange(variants.map((v) => v.price)) : "—"}
                    </span>
                  </span>
                  <span className="w-16 shrink-0 text-right">
                    <span
                      className={`block font-mono text-lg font-bold tabular-nums ${units === 0 ? "text-admin-danger" : "text-admin-text"}`}
                    >
                      {units}
                    </span>
                    <span className="block text-[11px] text-admin-muted">unidades</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-admin-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {usesColors && (
        <details className="rounded-lg border border-admin-border bg-admin-surface">
          <summary className="cursor-pointer px-4 py-3 text-[15px] font-semibold text-admin-text">
            Agregar o quitar un color en todos los productos de {colorScope.name}
          </summary>
          <div className="border-t border-admin-border">
            <CategoryColors
              key={colorScope.id}
              category={colorScope}
              models={models}
              onChanged={(message) => {
                setNotice(message);
                window.dispatchEvent(new Event(STOCK_CHANGED));
              }}
            />
          </div>
        </details>
      )}
    </div>
  );
}
