"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminApiError, updatePurchase, type DashboardPurchase } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../AdminNotice";
import { adminBadge, adminButton } from "../adminStyles";
import { PURCHASES_CHANGED, STATUS_BADGE, STATUS_LABEL, formatDay, purchaseTotal } from "../compras/purchaseStatus";
import { Panel } from "../StatCard";

/** Últimos pedidos a proveedores: lo pagado y en qué estado están. */
export default function PurchasesPanel({
  purchases,
  onReceived,
}: {
  purchases: DashboardPurchase[];
  onReceived: () => void;
}) {
  const [receiving, setReceiving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function receive(id: string) {
    setReceiving(id);
    setError(null);
    try {
      await updatePurchase(id, { status: "recibida" });
      window.dispatchEvent(new Event(PURCHASES_CHANGED));
      onReceived();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setReceiving(null);
    }
  }

  return (
    <Panel
      title="Pedidos"
      action={
        <Link href="/admin/compras" className="text-sm font-semibold text-admin-text hover:underline">
          Ver pedidos
        </Link>
      }
    >
      {purchases.length === 0 ? (
        <p className="text-sm text-admin-muted">
          Todavía no cargaste pedidos.{" "}
          <Link href="/admin/compras/nuevo" className="font-semibold text-admin-text underline">
            Cargar uno
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {purchases.map((p) => {
            const canReceive = p.status === "pagado" || p.status === "en_camino";
            return (
              <li key={p.id} className="flex items-start justify-between gap-3">
                <Link href={`/admin/compras/pedidos/${p.id}`} className="min-w-0 hover:opacity-80">
                  <p className="truncate text-[15px] font-semibold text-admin-text">
                    Pedido {p.number}, {p.supplier_name}
                  </p>
                  <p className="text-[13px] text-admin-muted">
                    {formatDay(p.purchase_date)} · {p.units === 1 ? "1 unidad" : `${p.units} unidades`}
                  </p>
                  <p className="text-[13px] text-admin-muted">
                    {p.status === "armando" ? "A pagar" : "Pagado"}{" "}
                    <span className="font-mono tabular-nums text-admin-text">{formatPrice(purchaseTotal(p))}</span>
                  </p>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={adminBadge(STATUS_BADGE[p.status])}>{STATUS_LABEL[p.status]}</span>
                  {canReceive && (
                    <button
                      type="button"
                      onClick={() => receive(p.id)}
                      disabled={receiving !== null}
                      className={adminButton("secondary", "sm")}
                    >
                      {receiving === p.id ? "Guardando…" : "Marcar recibido"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <div className="mt-4">
          <AdminNotice kind="danger" onClose={() => setError(null)}>
            {error}
          </AdminNotice>
        </div>
      )}
    </Panel>
  );
}
