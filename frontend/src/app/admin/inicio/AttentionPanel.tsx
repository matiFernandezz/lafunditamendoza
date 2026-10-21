"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dashboard, StockAlert } from "@/lib/adminApi";
import { Panel } from "../StatCard";

const VISIBLE = 6;

type Item = {
  key: string;
  tag: string;
  tone: "danger" | "warn" | "muted";
  title: string;
  detail: string;
  href?: string;
};

const DOT: Record<Item["tone"], string> = {
  danger: "bg-admin-danger",
  warn: "bg-admin-warn",
  muted: "bg-admin-muted",
};

function stockItem(alert: StockAlert): Item {
  if (alert.kind === "sin_stock") {
    return {
      key: alert.id,
      tag: "Sin stock",
      tone: "danger",
      title: alert.name,
      detail: "No queda ninguna unidad en ningún modelo.",
    };
  }
  if (alert.kind === "poco_stock") {
    return {
      key: alert.id,
      tag: "Poco stock",
      tone: "warn",
      title: alert.name,
      detail: alert.stock === 1 ? "Queda 1 sola unidad." : `Quedan ${alert.stock} unidades en total.`,
    };
  }
  return {
    key: alert.id,
    tag: "Modelos agotados",
    tone: "muted",
    title: alert.name,
    detail: `${alert.empty_variants} de ${alert.variants} modelos sin stock · quedan ${alert.stock} unidades.`,
  };
}

/** Lo que hay que resolver: reservas web sin cobrar, pedidos por llegar y faltantes de stock. */
export default function AttentionPanel({ alerts }: { alerts: Dashboard["alerts"] }) {
  const [showAll, setShowAll] = useState(false);

  const items: Item[] = [];
  if (alerts.web_pending > 0) {
    items.push({
      key: "web",
      tag: "Ventas web",
      tone: "danger",
      title: alerts.web_pending === 1 ? "1 reserva sin cobrar" : `${alerts.web_pending} reservas sin cobrar`,
      detail: "Cobralas o cancelalas antes de que venzan.",
      href: "/admin/web",
    });
  }
  if (alerts.purchases_on_the_way > 0) {
    items.push({
      key: "pedidos",
      tag: "Pedidos",
      tone: "warn",
      title:
        alerts.purchases_on_the_way === 1
          ? "1 pedido pagado por recibir"
          : `${alerts.purchases_on_the_way} pedidos pagados por recibir`,
      detail: "Cuando llegue, marcalo recibido para que sume el stock.",
      href: "/admin/compras",
    });
  }
  items.push(...alerts.products.map(stockItem));

  const visible = showAll ? items : items.slice(0, VISIBLE);
  const total = items.length;

  return (
    <Panel
      title="Para atender"
      action={
        total > VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-semibold text-admin-text hover:underline"
          >
            {showAll ? "Ver menos" : `Ver las ${total}`}
          </button>
        )
      }
    >
      {total === 0 ? (
        <p className="text-sm text-admin-muted">Nada pendiente. Todo el catálogo tiene stock.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((item) => {
            const body = (
              <>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-admin-text">
                  <span aria-hidden="true" className={`size-2 rounded-full ${DOT[item.tone]}`} />
                  {item.tag}
                </span>
                <span className="mt-0.5 block text-[15px] font-semibold text-admin-text">{item.title}</span>
                <span className="block text-[13px] text-admin-muted">{item.detail}</span>
              </>
            );
            return (
              <li key={item.key}>
                {item.href ? (
                  <Link href={item.href} className="block rounded-md hover:opacity-80">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
      {alerts.products.length > 0 && (
        <p className="mt-4 text-[13px] text-admin-muted">
          {[
            alerts.out_of_stock > 0 && `${alerts.out_of_stock} sin stock`,
            alerts.low_stock > 0 && `${alerts.low_stock} con poco stock`,
            alerts.missing_models > 0 && `${alerts.missing_models} con modelos agotados`,
          ]
            .filter(Boolean)
            .join(" · ")}
          . Reponelos desde{" "}
          <Link href="/admin/compras" className="font-semibold text-admin-text underline-offset-2 hover:underline">
            Compras
          </Link>
          .
        </p>
      )}
    </Panel>
  );
}
