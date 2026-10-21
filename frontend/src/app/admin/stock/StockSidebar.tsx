"use client";

import { useEffect, useState } from "react";
import { getAdminProducts } from "@/lib/adminApi";
import SubnavSidebar from "../SubnavSidebar";
import { STOCK_CHANGED, stockSections, useStockCategories } from "./stockData";

type Totals = { units: number; products: number; empty: number };

/** Segundo sidebar de Stock: un catálogo por categoría de tope y, al pie, lo que hay. */
export default function StockSidebar() {
  const categories = useStockCategories();
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = () =>
      getAdminProducts()
        .then((res) => {
          if (ignore) return;
          const active = res.data.filter((p) => p.active);
          setTotals({
            units: active.reduce((sum, p) => sum + p.product_variants.reduce((s, v) => s + v.stock_quantity, 0), 0),
            products: active.length,
            empty: active.filter((p) => p.product_variants.every((v) => v.stock_quantity === 0)).length,
          });
        })
        .catch(() => {});
    load();
    window.addEventListener(STOCK_CHANGED, load);
    return () => {
      ignore = true;
      window.removeEventListener(STOCK_CHANGED, load);
    };
  }, []);

  return (
    <SubnavSidebar
      title="Stock"
      subtitle="Productos, modelos y colores"
      sections={stockSections(categories)}
      footer={
        totals && (
          <div className="rounded-lg bg-admin-ink p-3.5 text-admin-on-ink">
            <p className="text-[12px] text-admin-on-ink/75">En stock</p>
            <p className="mt-0.5 font-mono text-xl font-bold tabular-nums">{totals.units} unidades</p>
            <p className="mt-1 text-[12px] leading-snug text-admin-on-ink/75">
              {totals.products} productos
              {totals.empty > 0 && `, ${totals.empty} sin stock`}
            </p>
          </div>
        )
      }
    />
  );
}
