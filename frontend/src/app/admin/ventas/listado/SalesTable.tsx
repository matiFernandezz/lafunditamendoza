"use client";

import { Ban, ChevronDown } from "lucide-react";
import { Fragment } from "react";
import type { Sale } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { adminBadge, adminButton } from "../../adminStyles";
import { displayColor } from "../utils";

// hourCycle h23: es-AR sale por defecto en 12 hs ("06:20 p. m.").
const timeFormat = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const voidedFormat = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatTime = (date: Date) => timeFormat.format(date);

export function unitCount(sale: Sale): number {
  return sale.sale_items.reduce((sum, item) => sum + item.quantity, 0);
}

const PAYMENT_LABELS: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia" };

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method.charAt(0).toUpperCase() + method.slice(1);
}

/** Ganancia de la venta: lo cobrado menos el costo de lo vendido. */
export function saleProfit(sale: Sale): number {
  return sale.total_amount - sale.sale_items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
}

/** "Funda Smile (iPhone 13), 2× Vidrio templado (iPhone 15)". */
function saleDetail(sale: Sale): string {
  return sale.sale_items
    .map((item) => {
      const name = item.variant?.product?.name ?? "Producto eliminado";
      const model = item.variant?.iphone_model?.name;
      return `${item.quantity > 1 ? `${item.quantity}× ` : ""}${name}${model ? ` (${model})` : ""}`;
    })
    .join(", ");
}

function customerLabel(sale: Sale): string | null {
  return sale.customer_name ?? (sale.web_order ? `Web ${sale.web_order.code}` : null);
}

function StatusBadge({ sale }: { sale: Sale }) {
  return sale.status === "anulada" ? (
    <span className={adminBadge("danger")}>Anulada</span>
  ) : (
    <span className={adminBadge("ink")}>Cobrada</span>
  );
}

/** Detalle desplegado: productos, descuento y el botón de anular. */
function SaleDetail({ sale, onVoid }: { sale: Sale; onVoid?: () => void }) {
  const voided = sale.status === "anulada";
  return (
    <div className="flex flex-col gap-3.5">
      <ul className="space-y-3">
        {sale.sale_items.map((item) => {
          const variant = item.variant;
          const detail = [variant?.iphone_model?.name, displayColor(variant?.color ?? null)].filter(Boolean).join(" · ");
          return (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block break-words text-[15px] font-semibold text-admin-text">
                  {variant?.product?.name ?? "Producto eliminado"}
                </span>
                {detail && <span className="block text-[13px] text-admin-muted">{detail}</span>}
                <span className="block font-mono text-[13px] text-admin-muted">
                  {item.quantity} × {formatPrice(item.unit_price)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[15px] font-semibold tabular-nums text-admin-text">
                {formatPrice(item.quantity * item.unit_price)}
              </span>
            </li>
          );
        })}
      </ul>

      {sale.discount_amount > 0 && (
        <dl className="flex flex-col gap-1.5 border-t border-dashed border-admin-border-strong pt-3 text-[15px]">
          <div className="flex justify-between text-admin-muted">
            <dt>Subtotal</dt>
            <dd className="font-mono tabular-nums">{formatPrice(sale.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-admin-muted">
            <dt>Descuento {sale.discount_percent}%</dt>
            <dd className="font-mono tabular-nums">− {formatPrice(sale.discount_amount)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-admin-text">
            <dt>Total cobrado</dt>
            <dd className="font-mono tabular-nums">{formatPrice(sale.total_amount)}</dd>
          </div>
        </dl>
      )}

      {voided ? (
        <p className="text-[13px] text-admin-muted">
          Anulada el {voidedFormat.format(new Date(sale.voided_at!))}
          {sale.void_reason ? ` · Motivo: ${sale.void_reason}` : ""}. No suma en los totales y su stock ya se devolvió.
        </p>
      ) : (
        onVoid && (
          <button type="button" onClick={onVoid} className={`${adminButton("dangerOutline", "sm")} self-start`}>
            <Ban aria-hidden="true" className="size-4" />
            Anular venta
          </button>
        )
      )}
    </div>
  );
}

/**
 * Ventas en tabla (desktop) o en filas apiladas (mobile). Con onToggle cada
 * venta se despliega con su detalle y el botón de anular.
 */
export default function SalesTable({
  sales,
  showProfit = false,
  showPayment = true,
  expandedId = null,
  onToggle,
  onVoid,
}: {
  sales: Sale[];
  showProfit?: boolean;
  showPayment?: boolean;
  expandedId?: string | null;
  onToggle?: (sale: Sale) => void;
  onVoid?: (sale: Sale) => void;
}) {
  const columns = 5 + (showPayment ? 1 : 0) + (showProfit ? 1 : 0) + (onToggle ? 1 : 0);

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-md border border-admin-border md:block">
        <table className="w-full border-collapse text-left text-[15px]">
          <thead className="bg-admin-bg text-[13px] font-semibold text-admin-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
              <th scope="col" className="px-4 py-3 font-semibold">Detalle</th>
              <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
              {showPayment && <th scope="col" className="px-4 py-3 font-semibold">Medio</th>}
              <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
              {showProfit && <th scope="col" className="px-4 py-3 text-right font-semibold">Ganancia</th>}
              <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              {onToggle && (
                <th scope="col" className="w-12 px-2 py-3">
                  <span className="sr-only">Ver detalle</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border bg-admin-surface">
            {sales.map((sale) => {
              const voided = sale.status === "anulada";
              const expanded = expandedId === sale.id;
              const date = new Date(sale.sale_date);
              const customer = customerLabel(sale);
              const muted = voided ? "text-admin-muted" : "text-admin-text";
              return (
                <Fragment key={sale.id}>
                  <tr
                    onClick={onToggle ? () => onToggle(sale) : undefined}
                    className={`${onToggle ? "cursor-pointer hover:bg-admin-bg" : ""} ${expanded ? "bg-admin-bg" : ""} transition-colors duration-150`}
                  >
                    <td className={`whitespace-nowrap px-4 py-3 ${muted}`}>
                      {dayFormat.format(date)}
                      <span className="ml-1.5 font-mono text-[13px] text-admin-muted">{timeFormat.format(date)}</span>
                    </td>
                    <td className={`max-w-0 px-4 py-3 ${muted}`}>
                      <span className="block truncate" title={saleDetail(sale)}>
                        {saleDetail(sale)}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 ${customer ? muted : "text-admin-muted"}`}>
                      {customer ?? "Sin cliente"}
                    </td>
                    {showPayment && (
                      <td className={`whitespace-nowrap px-4 py-3 ${muted}`}>{paymentLabel(sale.payment_method)}</td>
                    )}
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                        voided ? "text-admin-muted line-through" : "text-admin-text"
                      }`}
                    >
                      {formatPrice(sale.total_amount)}
                    </td>
                    {showProfit && (
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-admin-muted">
                        {voided ? "—" : formatPrice(saleProfit(sale))}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge sale={sale} />
                    </td>
                    {onToggle && (
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle(sale);
                          }}
                          aria-expanded={expanded}
                          aria-label={expanded ? "Ocultar detalle" : "Ver detalle"}
                          className="flex size-9 items-center justify-center rounded-md text-admin-muted hover:text-admin-text"
                        >
                          <ChevronDown
                            aria-hidden="true"
                            className={`size-5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      </td>
                    )}
                  </tr>
                  {expanded && (
                    <tr className="bg-admin-bg">
                      <td colSpan={columns} className="px-4 pb-4 pt-1">
                        <div className="max-w-[560px]">
                          <SaleDetail sale={sale} onVoid={onVoid ? () => onVoid(sale) : undefined} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-admin-border overflow-hidden rounded-md border border-admin-border bg-admin-surface md:hidden">
        {sales.map((sale) => {
          const voided = sale.status === "anulada";
          const expanded = expandedId === sale.id;
          const date = new Date(sale.sale_date);
          const customer = customerLabel(sale);
          const row = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-admin-text">{saleDetail(sale)}</span>
                <span className="mt-0.5 block text-[13px] text-admin-muted">
                  {dayFormat.format(date)} {timeFormat.format(date)} · {customer ?? "Sin cliente"}
                  {showPayment && ` · ${paymentLabel(sale.payment_method)}`}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`font-mono text-[15px] font-semibold tabular-nums ${
                    voided ? "text-admin-muted line-through" : "text-admin-text"
                  }`}
                >
                  {formatPrice(sale.total_amount)}
                </span>
                <StatusBadge sale={sale} />
              </span>
            </>
          );
          return (
            <li key={sale.id} className={expanded ? "bg-admin-bg" : ""}>
              {onToggle ? (
                <button
                  type="button"
                  onClick={() => onToggle(sale)}
                  aria-expanded={expanded}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  {row}
                </button>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3">{row}</div>
              )}
              {expanded && (
                <div className="border-t border-admin-border px-4 pb-4 pt-3">
                  <SaleDetail sale={sale} onVoid={onVoid ? () => onVoid(sale) : undefined} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
