"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPurchases, type PurchaseSummary } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import SubnavSidebar from "../SubnavSidebar";
import { COMPRAS_SECTIONS, PURCHASES_CHANGED, pendingPurchases, purchaseTotal } from "./purchaseStatus";

/** Segundo sidebar de Compras: secciones, lo que falta resolver y la plata en tránsito. */
export default function ComprasSidebar() {
  const [purchases, setPurchases] = useState<PurchaseSummary[] | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = () =>
      getPurchases()
        .then((res) => {
          if (!ignore) setPurchases(res.data);
        })
        .catch(() => {});
    load();
    window.addEventListener(PURCHASES_CHANGED, load);
    return () => {
      ignore = true;
      window.removeEventListener(PURCHASES_CHANGED, load);
    };
  }, []);

  const count = (status: PurchaseSummary["status"]) => purchases?.filter((p) => p.status === status).length ?? 0;
  const toResolve = [
    { status: "armando", label: "Armando", count: count("armando") },
    { status: "pagado", label: "Pagado", count: count("pagado") },
    { status: "en_camino", label: "En camino", count: count("en_camino") },
  ].filter((s) => s.count > 0);
  const pending = purchases ? pendingPurchases(purchases) : [];

  return (
    <SubnavSidebar
      title="Compras"
      subtitle="Pedidos a proveedores"
      sections={COMPRAS_SECTIONS}
      footer={
        pending.length > 0 && (
          <div className="rounded-lg bg-admin-ink p-3.5 text-admin-on-ink">
            <p className="text-[12px] text-admin-on-ink/75">Pagado, por recibir</p>
            <p className="mt-0.5 font-mono text-xl font-bold tabular-nums">
              {formatPrice(pending.reduce((sum, p) => sum + purchaseTotal(p), 0))}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-admin-on-ink/75">
              {pending.length === 1 ? "1 pedido" : `${pending.length} pedidos`},{" "}
              {pending.reduce((sum, p) => sum + p.units, 0)} unidades
            </p>
          </div>
        )
      }
    >
      {toResolve.length > 0 && (
        <div className="mt-4 border-t border-admin-border px-2.5 pt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-admin-muted">Falta resolver</p>
          <ul className="flex flex-col">
            {toResolve.map((s) => (
              <li key={s.status}>
                <Link
                  href={`/admin/compras?estado=${s.status}`}
                  className="flex items-center justify-between rounded-md py-1.5 text-[15px] text-admin-text hover:underline"
                >
                  {s.label}
                  <span className="rounded-full bg-admin-bg px-2 py-0.5 font-mono text-xs font-semibold">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SubnavSidebar>
  );
}
