"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ADMIN_TEXT_MUTED } from "../adminStyles";
import { topCategories, useStockCategories } from "./stockData";

/** Stock abre el catálogo de la primera categoría de tope (Fundas). */
export default function StockPage() {
  const router = useRouter();
  const categories = useStockCategories();

  useEffect(() => {
    if (!categories) return;
    const first = topCategories(categories)[0];
    router.replace(first ? `/admin/stock/${first.slug}` : "/admin/stock/nuevo");
  }, [categories, router]);

  return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>;
}
