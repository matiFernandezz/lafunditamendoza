"use client";

import { ChevronDown } from "lucide-react";
import type { Sale } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { ADMIN_BUTTON_DANGER_OUTLINE } from "../adminStyles";
import { displayColor } from "../ventas/utils";

// hourCycle h23: es-AR sale por defecto en 12 hs ("06:20 p. m."); acá la hora
// se lee "18:20", y además el formato largo no entra en la columna en mobile.
const timeFormat = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayFormat = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });
const voidedFormat = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatTime = (date: Date) => timeFormat.format(date);

const PAYMENT_LABELS: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia" };

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method.charAt(0).toUpperCase() + method.slice(1);
}

export function unitCount(sale: Sale): number {
  return sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);
}

export default function SaleRow({
  sale,
  showDay,
  expanded,
  onToggle,
  onVoid,
}: {
  sale: Sale;
  showDay: boolean;
  expanded: boolean;
  onToggle: () => void;
  onVoid: () => void;
}) {
  const date = new Date(sale.sale_date);
  const voided = sale.status === "anulada";
  const units = unitCount(sale);
  const detailId = `venta-${sale.id}`;

  return (
    <li className={voided ? "bg-admin-bg" : "bg-white"}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailId}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-admin-bg"
      >
        <span className={`w-14 shrink-0 pt-0.5 font-mono text-sm tabular-nums ${voided ? "text-admin-muted" : "text-admin-text"}`}>
          {showDay && <span className="block text-[11px] uppercase text-admin-muted">{dayFormat.format(date)}</span>}
          {formatTime(date)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`font-mono text-base font-semibold tabular-nums ${
                voided ? "text-admin-muted line-through" : "text-admin-text"
              }`}
            >
              {formatPrice(sale.total_amount)}
            </span>
            {voided && (
              <span className="rounded-full border border-admin-danger-border bg-admin-danger-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-admin-danger">
                Anulada
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[13px] text-admin-muted">
            {units === 1 ? "1 producto" : `${units} productos`} · {paymentLabel(sale.payment_method)}
          </span>
          {voided && sale.void_reason && (
            <span className="mt-1 block break-words text-[13px] text-admin-muted">
              Motivo: {sale.void_reason}
            </span>
          )}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`mt-1 size-4 shrink-0 text-admin-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div id={detailId} className="space-y-4 border-t border-admin-border px-4 pb-4 pt-3">
          <ul className="space-y-3">
            {sale.sale_items.map((item) => {
              const variant = item.variant;
              const detail = [variant?.iphone_model?.name, displayColor(variant?.color ?? null)]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-admin-text">
                      {variant?.product?.name ?? "Producto eliminado"}
                    </span>
                    {detail && <span className="block text-[13px] text-admin-muted">{detail}</span>}
                    <span className="block font-mono text-[13px] text-admin-muted">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-admin-text">
                    {formatPrice(item.quantity * item.unit_price)}
                  </span>
                </li>
              );
            })}
          </ul>

          {voided ? (
            <p className="text-[13px] text-admin-muted">
              Anulada el {voidedFormat.format(new Date(sale.voided_at!))}. No suma en los totales y su stock ya se devolvió.
            </p>
          ) : (
            <button type="button" onClick={onVoid} className={`${ADMIN_BUTTON_DANGER_OUTLINE} w-full sm:w-auto`}>
              Anular venta
            </button>
          )}
        </div>
      )}
    </li>
  );
}
