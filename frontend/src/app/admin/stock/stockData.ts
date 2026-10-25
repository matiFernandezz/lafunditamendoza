"use client";

import { useEffect, useState } from "react";
import { getAdminCategories, type AdminCategory, type VariantKind } from "@/lib/adminApi";
import type { SubnavSection } from "../SubnavSidebar";

/** Avisa a Stock que cambió el catálogo (stock, variantes, categorías): refrescan el menú y las listas. */
export const STOCK_CHANGED = "lf-stock-changed";

// Las categorías se piden una vez y las comparten el menú y las páginas; se
// vuelven a pedir cuando alguien avisa STOCK_CHANGED.
let cache: AdminCategory[] | null = null;
let pending: Promise<AdminCategory[]> | null = null;

function load(force = false): Promise<AdminCategory[]> {
  if (cache && !force) return Promise.resolve(cache);
  if (!pending || force) {
    pending = getAdminCategories()
      .then((res) => {
        cache = res.data;
        return res.data;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** Categorías del panel (null mientras cargan). */
export function useStockCategories(): AdminCategory[] | null {
  const [categories, setCategories] = useState<AdminCategory[] | null>(cache);

  useEffect(() => {
    let ignore = false;
    load()
      .then((data) => {
        if (!ignore) setCategories(data);
      })
      .catch(() => {});
    const onChange = () =>
      load(true)
        .then((data) => {
          if (!ignore) setCategories(data);
        })
        .catch(() => {});
    window.addEventListener(STOCK_CHANGED, onChange);
    return () => {
      ignore = true;
      window.removeEventListener(STOCK_CHANGED, onChange);
    };
  }, []);

  return categories;
}

/** Las categorías de tope (Fundas, Accesorios), en su orden. */
export function topCategories(categories: AdminCategory[]) {
  return categories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
}

const KIND_HINT: Record<VariantKind, string> = { color: "por color", motif: "por diseño", none: "" };

/** "Por modelo y color", "Universales", "Por diseño"… para el menú. */
export function settingsHint(kind: VariantKind, byModel: boolean) {
  const model = byModel ? "Por modelo" : "Universales";
  return KIND_HINT[kind] ? `${model} y ${KIND_HINT[kind]}` : model;
}

/** Secciones del menú de Stock: una por categoría de tope, y las fijas. */
export function stockSections(categories: AdminCategory[] | null): SubnavSection[] {
  const tops = categories ? topCategories(categories) : [];
  return [
    ...tops.map((c) => ({
      href: `/admin/stock/${c.slug}`,
      label: c.name,
      hint: settingsHint(c.variant_kind ?? "none", c.by_model ?? false),
    })),
    { href: "/admin/stock/nuevo", label: "Nuevo producto", hint: "Con sus modelos y fotos" },
    { href: "/admin/stock/colores", label: "Colores y diseños", hint: "Nombres, tonos y unir" },
    { href: "/admin/stock/compartido", label: "Stock compartido", hint: "Modelos con las mismas fundas" },
    { href: "/admin/stock/categorias", label: "Categorías", hint: "Cómo son sus variantes" },
  ];
}
