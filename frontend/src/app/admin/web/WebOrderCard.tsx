"use client";

import { Check, MessageCircle } from "lucide-react";
import type { WebOrder } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { timeLeftText } from "@/lib/useNow";
import { ADMIN_TEXT_MUTED, adminBadge, adminButton } from "../adminStyles";
import { displayColor } from "../ventas/utils";

const HOUR = 3_600_000;
const WARN_MS = 3 * HOUR;

const dateTimeFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function ago(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 1440) return `hace ${Math.floor(minutes / 60)} h`;
  return `hace ${Math.floor(minutes / 1440)} d`;
}

/** wa.me del cliente. Acepta "261 555 1234", "0261…", "+54 9 261…". */
export function customerWhatsapp(phone: string) {
  let digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits.startsWith("54")) digits = `549${digits}`;
  return `https://wa.me/${digits}`;
}

export function orderUnits(order: WebOrder) {
  return order.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function isExpired(order: WebOrder, now: number | null) {
  return order.status === "pendiente" && now !== null && new Date(order.expires_at).getTime() <= now;
}

export default function WebOrderCard({
  order: o,
  now,
  onPaid,
  onCancel,
}: {
  order: WebOrder;
  now: number | null;
  onPaid: () => void;
  onCancel: () => void;
}) {
  const pending = o.status === "pendiente";
  const expired = isExpired(o, now);
  const holdMs = new Date(o.expires_at).getTime() - new Date(o.created_at).getTime();
  const msLeft = now === null ? null : new Date(o.expires_at).getTime() - now;
  const fraction = msLeft === null ? 1 : Math.max(0, Math.min(1, msLeft / holdMs));
  const urgency = expired ? "danger" : msLeft !== null && msLeft < WARN_MS ? "warn" : "ink";

  const badge =
    o.status === "pagada" ? (
      <span className={adminBadge("ok")}>Pagada</span>
    ) : o.status === "cancelada" ? (
      <span className={adminBadge("neutral")}>Cancelada</span>
    ) : expired ? (
      <span className={adminBadge("danger")}>Vencida</span>
    ) : (
      <span className={adminBadge("warn")}>Pendiente de pago</span>
    );

  return (
    <li
      className={`flex min-w-0 flex-col gap-3 rounded-md border bg-white p-4 ${
        expired ? "border-admin-danger-border" : "border-admin-border"
      } ${o.status === "cancelada" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[15px] font-bold text-admin-text">{o.code}</span>
            {badge}
          </span>
          <span className="break-words text-[15px] font-semibold text-admin-text">{o.customer_name}</span>
        </div>
        <span
          className={`shrink-0 font-mono text-xl font-bold tabular-nums text-admin-text ${
            o.status === "cancelada" ? "line-through" : ""
          }`}
        >
          {formatPrice(o.total_amount)}
        </span>
      </div>

      {pending && (
        <div className="flex flex-col gap-1.5">
          <div className={`flex justify-between gap-2 ${ADMIN_TEXT_MUTED}`}>
            <span>{now === null ? "" : `Reservada ${ago(o.created_at, now)}`}</span>
            <span
              className={`font-semibold ${
                urgency === "danger" ? "text-admin-danger" : urgency === "warn" ? "text-admin-warn" : "text-admin-text"
              }`}
            >
              {msLeft === null ? "" : expired ? "Venció la reserva" : `Vence en ${timeLeftText(msLeft)}`}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-sm bg-admin-border">
            <div
              className={`h-full ${
                urgency === "danger" ? "bg-admin-danger" : urgency === "warn" ? "bg-admin-warn" : "bg-admin-ink"
              }`}
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2 border-t border-admin-border pt-3">
        {o.items.map((i) => {
          const detail = [i.variant?.iphone_model?.name, displayColor(i.variant?.color ?? null)]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="block break-words text-[15px] font-semibold text-admin-text">
                  {i.variant?.product?.name ?? "Producto"}
                </span>
                <span className={`block ${ADMIN_TEXT_MUTED}`}>
                  {detail ? `${detail} · ` : ""}
                  {i.quantity} × {formatPrice(i.unit_price)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[15px] tabular-nums text-admin-text">
                {formatPrice(i.quantity * i.unit_price)}
              </span>
            </li>
          );
        })}
      </ul>

      {o.status === "pagada" && o.paid_at && (
        <p className={ADMIN_TEXT_MUTED}>Pagada {dateTimeFormat.format(new Date(o.paid_at))} · ya figura en el historial.</p>
      )}
      {o.status === "cancelada" && (
        <p className={ADMIN_TEXT_MUTED}>
          Cancelada{o.cancel_reason ? ` · ${o.cancel_reason}` : ""} · el stock volvió.
        </p>
      )}
      {expired && (
        <p className="text-[13px] text-admin-danger">
          Pasaron las 24 h. Si no pagó, cancelala para liberar el stock.
        </p>
      )}

      <div className={`grid gap-2 ${pending ? "grid-cols-[48px_1fr_1fr]" : "grid-cols-1"}`}>
        <a
          href={customerWhatsapp(o.customer_phone)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Escribir a ${o.customer_name} por WhatsApp`}
          title={o.customer_phone}
          className={
            pending
              ? "inline-flex h-12 items-center justify-center rounded-md border border-admin-border-strong bg-white text-admin-text transition-colors duration-200 hover:bg-admin-bg"
              : adminButton("secondary")
          }
        >
          <MessageCircle aria-hidden="true" className="size-5" />
          {!pending && `WhatsApp · ${o.customer_phone}`}
        </a>
        {pending && (
          <button type="button" onClick={onCancel} className={adminButton("dangerOutline")}>
            Cancelar
          </button>
        )}
        {pending && (
          <button type="button" onClick={onPaid} className={adminButton("primary")}>
            <Check aria-hidden="true" className="size-[18px]" />
            Pagada
          </button>
        )}
      </div>
    </li>
  );
}
