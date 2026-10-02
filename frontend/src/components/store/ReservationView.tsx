"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { PublicReservation } from "@/lib/reservations";
import { RESERVATION_HOURS, STORE_WHATSAPP, TRANSFER } from "@/lib/storeConfig";
import { STORE_BUTTON, STORE_CAP, STORE_NARROW, STORE_TEXT_LINK } from "@/lib/storeStyles";
import { timeLeftText, useNow } from "@/lib/useNow";

function itemDetail(item: PublicReservation["items"][number]) {
  return [item.variant?.iphone_model?.name, item.variant?.color].filter(Boolean).join(" · ");
}

function whatsappLink(r: PublicReservation) {
  const lines = r.items.map((i) => {
    const detail = itemDetail(i);
    return `• ${i.variant?.product?.name ?? "Producto"}${detail ? ` · ${detail}` : ""} ×${i.quantity}`;
  });
  const message = [
    `¡Hola La Fundita! Te mando el comprobante de mi reserva ${r.code} por ${formatPrice(r.total_amount)}.`,
    ...lines,
    `A nombre de: ${r.customer_name}`,
  ].join("\n");
  return `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function CopyRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Sin permiso de portapapeles: el dato igual queda a la vista para copiarlo a mano.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-rule py-4">
      <div className="min-w-0">
        <span className={`${STORE_CAP} mb-1 block`}>{label}</span>
        <span className={`break-all font-mono text-ink ${small ? "text-[15px]" : "text-xl"}`}>{value}</span>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar ${label.toLowerCase()}`}
        className={`h-11 shrink-0 rounded-full border px-[18px] text-[15px] font-medium transition-colors duration-200 ${
          copied ? "border-ink bg-ink text-paper" : "border-rule text-ink hover:border-ink"
        }`}
      >
        <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
      </button>
    </div>
  );
}

export default function ReservationView({ reservation: r }: { reservation: PublicReservation }) {
  const now = useNow();
  const msLeft = now === null ? null : new Date(r.expires_at).getTime() - now;
  const pending = r.status === "pendiente";
  const expired = pending && msLeft !== null && msLeft <= 0;

  const state =
    r.status === "pagada"
      ? {
          title: "¡Pago confirmado!",
          text: "Ya recibimos tu transferencia. Te escribimos por WhatsApp para coordinar la entrega.",
        }
      : r.status === "cancelada"
        ? {
            title: "Esta reserva se canceló",
            text: "Las fundas volvieron a estar disponibles. Si querés, armá un carrito nuevo.",
          }
        : expired
          ? {
              title: "La reserva venció",
              text: `Pasaron las ${RESERVATION_HOURS} horas. Escribinos por WhatsApp y vemos si todavía hay stock.`,
            }
          : null;

  return (
    <div className={STORE_NARROW}>
      <div className="flex flex-col gap-3">
        <span className={STORE_CAP}>Reserva {r.code}</span>
        <h1 className="font-display text-section font-semibold leading-heading tracking-tight text-pretty text-ink">
          {state ? state.title : "Transferí y mandanos el comprobante"}
        </h1>
        {state && <p className="text-graphite">{state.text}</p>}
      </div>

      {!state && (
        <div className="-mx-5 flex flex-col gap-1 bg-ink px-5 py-5 text-paper sm:-mx-6 sm:px-6 md:mx-0">
          <span className="text-[15px]">Te guardamos tus fundas por {RESERVATION_HOURS} horas.</span>
          <span className="min-h-[1.5em] font-mono text-[22px]">
            {msLeft === null ? "" : `Quedan ${timeLeftText(msLeft)}`}
          </span>
        </div>
      )}

      {pending && !expired && (
        <>
          <div>
            <span className={`${STORE_CAP} mb-1.5 block`}>Total a transferir</span>
            <span className="font-mono text-[44px] font-medium leading-none tabular-nums text-ink">
              {formatPrice(r.total_amount)}
            </span>
          </div>

          <div className="border-b border-rule">
            <CopyRow label="Alias" value={TRANSFER.alias} />
            <CopyRow label="CBU" value={TRANSFER.cbu} small />
            <p className="pb-4 pt-3 text-sm text-graphite">
              Titular: {TRANSFER.holder} · {TRANSFER.bank}
              {TRANSFER.isTestData && " · datos de prueba"}
            </p>
          </div>

          <ol className="flex flex-col gap-3">
            {[
              "Transferí el total al alias o al CBU.",
              "Mandanos el comprobante por WhatsApp.",
              "Te confirmamos el pago y coordinamos la entrega.",
            ].map((step, index) => (
              <li key={step} className="flex items-baseline gap-3.5 text-[15px] text-ink">
                <span className="w-[18px] font-display text-xl font-semibold">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="flex flex-col items-center gap-3">
        {r.status !== "cancelada" && (
          <a
            href={whatsappLink(r)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${STORE_BUTTON} w-full`}
          >
            {pending && !expired ? "Mandar comprobante a WhatsApp" : "Escribirnos por WhatsApp"}
          </a>
        )}
        <Link href="/" className={STORE_TEXT_LINK}>
          Volver a la tienda
        </Link>
      </div>

      <div className="flex flex-col gap-2 border-t border-rule pt-4">
        <span className={STORE_CAP}>Tu pedido</span>
        {r.items.map((i) => {
          const detail = itemDetail(i);
          return (
            <div key={i.id} className="flex justify-between gap-3 text-[15px] text-ink">
              <span className="min-w-0">
                {i.variant?.product?.name ?? "Producto"}{" "}
                <span className="text-graphite">
                  {detail ? `· ${detail} ` : ""}×{i.quantity}
                </span>
              </span>
              <span className="shrink-0 font-mono tabular-nums">{formatPrice(i.quantity * i.unit_price)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
