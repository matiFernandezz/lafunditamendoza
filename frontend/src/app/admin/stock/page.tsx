"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { topCategories, useStockCategories } from "./stockData";
import AdminLoading from "../AdminLoading";

/** Stock abre el catálogo de la primera categoría de tope (Fundas). */
export default function StockPage() {
  const router = useRouter();
  const categories = useStockCategories();

  useEffect(() => {
    if (!categories) return;
    const first = topCategories(categories)[0];
    router.replace(first ? `/admin/stock/${first.slug}` : "/admin/stock/nuevo");
  }, [categories, router]);

  return <AdminLoading />;
}
