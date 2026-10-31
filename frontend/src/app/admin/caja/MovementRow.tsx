"use client";

import type { CashAccount, CashKind, CashMovement } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { adminBadge } from "../adminStyles";
import { ACCOUNT_LABEL } from "./CashDialogs";

// Categorías que el sistema asigna solo a cada tipo: repiten la etiqueta, así que no se muestran.
const DEFAULT_CATEGORIES = new Set(["Ventas", "Aportes", "Retiros", "Transferencia entre cuentas", "Ajuste de caja"]);

export const KIND_LABEL: Record<CashKind, string> = {
  aporte: "Aporte",
  retiro: "Retiro",
  gasto: "Gasto",
  transferencia: "Transferencia",
  venta: "Venta",
  compra: "Pedido",
  ajuste: "Ajuste",
};

const dayTime = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeOnly = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

/**
 * Un movimiento del libro. En el celular es una tarjeta de tres renglones
 * (descripción y monto, etiquetas con cuenta y fecha, y la acción); desde md es
 * una fila de columnas fijas, como una tabla.
 */
export default function MovementRow({
  movement: m,
  showDay,
  onVoid,
  onChangeAccount,
}: {
  movement: CashMovement;
  /** Si el período abarca varios días, la fecha lleva el día además de la hora. */
  showDay: boolean;
  onVoid: (movement: CashMovement) => void;
  onChangeAccount: (movement: CashMovement, account: CashAccount) => void;
}) {
  const voided = m.voided_at !== null;
  const date = new Date(m.occurred_at);
  const when = showDay ? dayTime.format(date) : timeOnly.format(date);
  const sign = m.direction === "ingreso" ? "+" : "−";
  const otherAccount: CashAccount = m.account === "efectivo" ? "banco" : "efectivo";
  const canChangeAccount = !voided && m.kind === "compra";
  const canVoid = !voided && m.kind !== "venta" && m.kind !== "compra";
  const category = m.category && !DEFAULT_CATEGORIES.has(m.category) ? m.category : null;
  const description = m.description || KIND_LABEL[m.kind];

  const amountColor = voided ? "text-admin-muted line-through" : m.direction === "ingreso" ? "text-admin-ok" : "text-admin-text";
  const badge = (
    <span className={adminBadge(voided ? "danger" : m.direction === "ingreso" ? "ok" : "neutral")}>
      {voided ? "Anulado" : KIND_LABEL[m.kind]}
    </span>
  );
  const action = (
    <>
      {canChangeAccount && (
        <button
          type="button"
          onClick={() => onChangeAccount(m, otherAccount)}
          className="min-h-9 text-sm font-semibold text-admin-text underline-offset-2 hover:underline"
        >
          Pasar a {ACCOUNT_LABEL[otherAccount].toLowerCase()}
        </button>
      )}
      {canVoid && (
        <button
          type="button"
          onClick={() => onVoid(m)}
          className="min-h-9 text-sm font-semibold text-admin-danger underline-offset-2 hover:underline"
        >
          Anular
        </button>
      )}
    </>
  );
  const descriptionClass = `break-words text-[15px] font-medium text-admin-text ${voided ? "line-through opacity-60" : ""}`;

  return (
    <li>
      {/* Celular: descripción; etiqueta y cuenta con el monto a la derecha; fecha con la acción a la derecha. */}
      <div className="flex flex-col gap-2 py-4 md:hidden">
        <p className={`text-base ${descriptionClass}`}>{description}</p>
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-admin-muted">
            {badge}
            {category && <span>{category}</span>}
            <span aria-hidden="true">·</span>
            <span>{ACCOUNT_LABEL[m.account]}</span>
          </p>
          <span className={`shrink-0 whitespace-nowrap font-mono text-lg font-semibold tabular-nums ${amountColor}`}>
            {sign} {formatPrice(m.amount)}
          </span>
        </div>
        <div className="flex min-h-9 items-center justify-between gap-3">
          <span className="font-mono text-xs text-admin-muted">{when}</span>
          {(canChangeAccount || canVoid) && <span className="flex items-center">{action}</span>}
        </div>
        {voided && m.void_reason && <p className="text-[13px] text-admin-muted">Motivo: {m.void_reason}</p>}
      </div>

      {/* Compu */}
      <div className="hidden items-center gap-x-4 py-3 md:flex">
        <span className="w-[92px] shrink-0 font-mono text-xs text-admin-muted">{when}</span>
        <div className="min-w-0 flex-1">
          <p className={descriptionClass}>{description}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-admin-muted">
            {badge}
            {category && <span>{category}</span>}
            {voided && m.void_reason && <span>· {m.void_reason}</span>}
          </p>
        </div>
        <span className="shrink-0 text-sm text-admin-muted">{ACCOUNT_LABEL[m.account]}</span>
        <span className={`w-[120px] shrink-0 whitespace-nowrap text-right font-mono text-[15px] font-semibold tabular-nums ${amountColor}`}>
          {sign} {formatPrice(m.amount)}
        </span>
        <span className="flex w-[130px] shrink-0 items-center justify-end gap-2">{action}</span>
      </div>
    </li>
  );
}
