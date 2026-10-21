"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSalesSummary, type SalesSummary } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { presetRange } from "../periods";
import SubnavSidebar from "../SubnavSidebar";
import { SALES_CHANGED } from "./salesEvents";
import { VENTAS_SECTIONS } from "./sections";

const monthName = new Intl.DateTimeFormat("es-AR", { month: "long" });

/** Segundo sidebar de Ventas: secciones y, al pie, lo vendido en el mes. */
export default function VentasSidebar() {
  const pathname = usePathname();
  const [month, setMonth] = useState<{ name: string; summary: SalesSummary } | null>(null);

  // Se pide al entrar y cada vez que una venta se registra o se anula.
  useEffect(() => {
    let ignore = false;
    const load = () => {
      const now = new Date();
      const range = presetRange("month", now);
      getSalesSummary({ from: range.from.toISOString(), to: range.to.toISOString() })
        .then((res) => {
          if (!ignore) setMonth({ name: monthName.format(now), summary: res.data });
        })
        .catch(() => {});
    };
    load();
    window.addEventListener(SALES_CHANGED, load);
    return () => {
      ignore = true;
      window.removeEventListener(SALES_CHANGED, load);
    };
  }, []);

  const sections = VENTAS_SECTIONS.map((s) =>
    s.href === "/admin/ventas/listado" ? { ...s, count: month?.summary.sales_count } : s,
  );

  return (
    <SubnavSidebar
      title="Ventas"
      subtitle="Mostrador, web y redes"
      sections={sections}
      footer={
        month && (
          <div className="rounded-lg bg-admin-ink p-3.5 text-admin-on-ink">
            <p className="text-[12px] text-admin-on-ink/75">Vendido en {month.name}</p>
            <p className="mt-0.5 font-mono text-xl font-bold tabular-nums">{formatPrice(month.summary.total_amount)}</p>
            <p className="mt-1 text-[12px] leading-snug text-admin-on-ink/75">
              {month.summary.sales_count === 1 ? "1 venta" : `${month.summary.sales_count} ventas`}, ganancia de{" "}
              {formatPrice(month.summary.gross_profit)}
            </p>
            {pathname !== "/admin/ventas" && (
              <Link href="/admin/ventas" className="mt-2.5 inline-block text-sm font-semibold hover:underline">
                Nueva venta
              </Link>
            )}
          </div>
        )
      }
    />
  );
}
