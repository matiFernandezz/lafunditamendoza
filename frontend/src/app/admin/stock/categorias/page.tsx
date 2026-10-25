"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  getAdminProducts,
  updateCategory,
  type AdminCategory,
  type AdminProduct,
  type VariantKind,
} from "@/lib/adminApi";
import AdminNotice from "../../AdminNotice";
import { ADMIN_INPUT, ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE, ADMIN_TEXT_MUTED } from "../../adminStyles";
import { resolveCategorySettings } from "../../categoryPath";
import { STOCK_CHANGED, topCategories, useStockCategories } from "../stockData";
import AdminLoading from "../../AdminLoading";

const KIND_LABEL: Record<VariantKind, string> = { color: "Color", motif: "Diseño", none: "Sin variante" };
const KIND_HELP: Record<VariantKind, string> = {
  color: "cada variante es un color (Negro, Rosa pastel…)",
  motif: "cada variante es un diseño (dibujos, personajes, estampados)",
  none: "las variantes se distinguen solo por modelo o por una descripción (tipo C a C, 20W)",
};
const INHERIT = "";

/** Configuración de cada categoría: cómo son las variantes de sus productos. */
export default function CategoriasPage() {
  const categories = useStockCategories();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getAdminProducts()
      .then((res) => {
        if (!ignore) setProducts(res.data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const settings = useMemo(() => (categories ? resolveCategorySettings(categories) : null), [categories]);
  const productCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
    return counts;
  }, [products]);

  async function save(
    category: AdminCategory,
    patch: { variant_kind?: VariantKind | null; by_model?: boolean | null },
  ) {
    setSavingId(category.id);
    setError(null);
    setNotice(null);
    try {
      await updateCategory(category.id, patch);
      window.dispatchEvent(new Event(STOCK_CHANGED));
      setNotice(`${category.name}: guardado.`);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setSavingId(null);
    }
  }

  if (!categories || !settings) return <AdminLoading />;

  const byId = new Map(categories.map((c) => [c.id, c]));
  const tree = topCategories(categories).map((top) => ({
    top,
    children: categories
      .filter((c) => c.parent_id === top.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es")),
  }));

  function renderRow(category: AdminCategory, child: boolean) {
    const effective = settings!(category.id);
    // Lo que heredaría si no tuviera nada propio: lo de la categoría de arriba.
    const parentSettings = category.parent_id ? settings!(category.parent_id) : null;
    const busy = savingId === category.id;
    const count = child
      ? (productCount.get(category.id) ?? 0)
      : categories!
          .filter((c) => c.id === category.id || c.parent_id === category.id)
          .reduce((sum, c) => sum + (productCount.get(c.id) ?? 0), 0);

    return (
      <li
        key={category.id}
        className={`grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_200px_200px] md:items-center ${child ? "md:pl-10" : "bg-admin-bg/50"}`}
      >
        <div className="min-w-0">
          <p className={`text-[15px] text-admin-text ${child ? "" : "font-semibold"}`}>{category.name}</p>
          <p className="text-[13px] text-admin-muted">
            <Link
              href={
                child
                  ? `/admin/stock/${byId.get(category.parent_id!)?.slug}?tipo=${category.id}`
                  : `/admin/stock/${category.slug}`
              }
              className="font-semibold text-admin-text underline-offset-2 hover:underline"
            >
              {count === 1 ? "1 producto" : `${count} productos`}
            </Link>{" "}
            · {KIND_HELP[effective.kind]}
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-admin-muted md:sr-only">Variante</span>
          <select
            value={category.variant_kind ?? INHERIT}
            disabled={busy}
            onChange={(e) =>
              save(category, { variant_kind: e.target.value === INHERIT ? null : (e.target.value as VariantKind) })
            }
            className={`${ADMIN_INPUT} ${category.variant_kind === null ? "text-admin-muted" : ""}`}
          >
            {parentSettings && (
              <option value={INHERIT}>
                Igual que {byId.get(category.parent_id!)?.name} ({KIND_LABEL[parentSettings.kind]})
              </option>
            )}
            {(Object.keys(KIND_LABEL) as VariantKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-admin-muted md:sr-only">Va por</span>
          <select
            value={category.by_model === null ? INHERIT : category.by_model ? "model" : "universal"}
            disabled={busy}
            onChange={(e) =>
              save(category, { by_model: e.target.value === INHERIT ? null : e.target.value === "model" })
            }
            className={`${ADMIN_INPUT} ${category.by_model === null ? "text-admin-muted" : ""}`}
          >
            {parentSettings && (
              <option value={INHERIT}>
                Igual que {byId.get(category.parent_id!)?.name} ({parentSettings.byModel ? "por modelo" : "universal"})
              </option>
            )}
            <option value="model">Por modelo de iPhone</option>
            <option value="universal">Universal</option>
          </select>
        </label>
      </li>
    );
  }

  return (
    <div className="flex max-w-[960px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Categorías</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          Cómo son las variantes de cada categoría. Decide qué te pregunta Stock al agregar: color, diseño o nada, y si
          va por modelo de iPhone o es universal. Los tipos usan lo de su categoría salvo que les cambies algo.
        </p>
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="danger" onClose={() => setError(null)}>
          {error}
        </AdminNotice>
      )}

      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
        <div className="hidden grid-cols-[minmax(0,1fr)_200px_200px] gap-2 border-b border-admin-border bg-admin-bg px-4 py-2.5 text-[13px] font-semibold text-admin-muted md:grid">
          <span>Categoría</span>
          <span>Variante</span>
          <span>Va por</span>
        </div>
        <ul className="divide-y divide-admin-border">
          {tree.map(({ top, children }) => (
            <li key={top.id}>
              <ul className="divide-y divide-admin-border">
                {renderRow(top, false)}
                {children.map((c) => renderRow(c, true))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <p className={ADMIN_TEXT_MUTED}>
        Cambiar una categoría no toca las variantes que ya existen: vale para lo que se agregue de ahora en más. Donde
        la variante no es Color, no se pueden agregar colores.
      </p>
    </div>
  );
}
