"use client";

import { SubnavTabs } from "../SubnavSidebar";
import { stockSections, useStockCategories } from "./stockData";

/**
 * Stock: en desktop las secciones van en el segundo sidebar (StockSidebar, lo
 * arma AdminShell); en mobile y tablet, como pestañas arriba.
 */
export default function StockLayout({ children }: { children: React.ReactNode }) {
  const categories = useStockCategories();
  return (
    <div className="flex flex-col gap-5">
      <SubnavTabs title="Stock" sections={stockSections(categories)} />
      {children}
    </div>
  );
}
