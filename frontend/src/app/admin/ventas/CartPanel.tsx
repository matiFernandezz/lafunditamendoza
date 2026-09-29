"use client";

import { Minus, Plus, Trash2, X } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { ADMIN_ALERT_ERROR, ADMIN_BUTTON_PRIMARY, ADMIN_ICON_BUTTON, ADMIN_INPUT } from "../adminStyles";
import type { CartItem, DiscountChoice, PaymentMethod } from "./types";
import { MAX_DISCOUNT_PERCENT, discountAmount, resolveDiscount } from "./utils";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
];

// Los que se usan con amigos; cualquier otro va por "Otro".
const DISCOUNT_PRESETS = [10, 15, 20];

function choiceClass(active: boolean) {
  return `h-10 rounded-md border text-sm font-semibold transition-colors ${
    active
      ? "border-black bg-black text-white"
      : "border-admin-border bg-white text-admin-text hover:bg-admin-bg"
  }`;
}

export default function CartPanel({
  items,
  open,
  onOpenChange,
  paymentMethod,
  onPaymentMethodChange,
  discount,
  onDiscountChange,
  onUpdateQuantity,
  onRemove,
  onConfirm,
  submitting,
  error,
}: {
  items: CartItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  discount: DiscountChoice;
  onDiscountChange: (discount: DiscountChoice) => void;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const percent = resolveDiscount(discount);
  const discounted = percent ? discountAmount(subtotal, percent) : 0;
  const total = subtotal - discounted;

  return (
    <>
      {/* Barra flotante para abrir la venta actual (solo mobile, solo si hay items) */}
      {!open && itemCount > 0 && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed inset-x-4 bottom-4 z-20 flex h-14 items-center justify-between rounded-md bg-black px-5 text-white shadow-lg md:hidden"
        >
          <span className="text-sm font-semibold">
            {itemCount} {itemCount === 1 ? "producto" : "productos"}
            {percent ? <span className="ml-2 font-normal text-white/70">−{percent}%</span> : null}
          </span>
          <span className="text-base font-bold">{formatPrice(total)}</span>
        </button>
      )}

      {/* Fondo oscuro detrás del sheet en mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      <aside
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-md border border-admin-border bg-white p-4 shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        } md:sticky md:top-20 md:z-auto md:h-[calc(100vh-6rem)] md:max-h-none md:w-80 md:shrink-0 lg:w-96 md:translate-y-0 md:rounded-md md:border md:shadow-none`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-admin-text">Venta actual</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`${ADMIN_ICON_BUTTON} md:hidden`}
            aria-label="Cerrar venta actual"
            title="Cerrar venta actual"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-center text-sm text-admin-muted">
            Todavía no agregaste productos a la venta.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 divide-y divide-admin-border">
            {items.map((item) => (
              <li key={item.variantId} className="flex items-start justify-between gap-3 pt-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-admin-text">{item.productName}</p>
                  <p className="break-words text-[13px] text-admin-muted">{item.variantLabel}</p>
                  <p className="mt-1 text-sm font-medium text-admin-text">{formatPrice(item.price)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                      className={`${ADMIN_ICON_BUTTON} size-8`}
                      aria-label="Restar una unidad"
                      title="Restar una unidad"
                    >
                      <Minus aria-hidden="true" className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-admin-text">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.stockQuantity}
                      className={`${ADMIN_ICON_BUTTON} size-8`}
                      aria-label="Sumar una unidad"
                      title="Sumar una unidad"
                    >
                      <Plus aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.variantId)}
                    aria-label="Quitar de la venta"
                    title="Quitar de la venta"
                    className="inline-flex h-7 items-center gap-1 px-1 text-xs font-medium text-admin-danger"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-admin-text">Medio de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => onPaymentMethodChange(m.value)}
                    className={`h-10 rounded-md border text-sm font-semibold transition-colors ${
                      paymentMethod === m.value
                        ? "border-black bg-black text-white"
                        : "border-admin-border bg-white text-admin-text hover:bg-admin-bg"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-admin-text">Descuento</p>
              <div role="radiogroup" aria-label="Descuento" className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={discount.kind === "none"}
                  aria-label="Sin descuento"
                  onClick={() => onDiscountChange({ kind: "none" })}
                  className={choiceClass(discount.kind === "none")}
                >
                  Sin
                </button>
                {DISCOUNT_PRESETS.map((p) => {
                  const active = discount.kind === "preset" && discount.percent === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onDiscountChange({ kind: "preset", percent: p })}
                      className={choiceClass(active)}
                    >
                      {p}%
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={discount.kind === "custom"}
                  onClick={() =>
                    discount.kind !== "custom" && onDiscountChange({ kind: "custom", text: "" })
                  }
                  className={choiceClass(discount.kind === "custom")}
                >
                  Otro
                </button>
              </div>
              {discount.kind === "custom" && (
                <div className="mt-2">
                  <label htmlFor="descuento-otro" className="sr-only">
                    Porcentaje de descuento
                  </label>
                  <div className="relative w-28">
                    <input
                      id="descuento-otro"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_DISCOUNT_PERCENT}
                      step={1}
                      value={discount.text}
                      autoFocus
                      onChange={(e) => onDiscountChange({ kind: "custom", text: e.target.value })}
                      placeholder="20"
                      className={`${ADMIN_INPUT} pr-8 text-right font-mono`}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-admin-muted"
                    >
                      %
                    </span>
                  </div>
                  {percent === null && (
                    <p className="mt-1 text-[13px] text-admin-muted">
                      Poné un número entero entre 1 y {MAX_DISCOUNT_PERCENT}.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1 border-t border-admin-border pt-4">
              {discounted > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm text-admin-muted">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold text-emerald-700">
                    <span>Descuento {percent}%</span>
                    <span className="tabular-nums">−{formatPrice(discounted)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-lg font-bold text-admin-text">
                <span>{discounted > 0 ? "Total a cobrar" : "Total"}</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {error && <p role="alert" className={ADMIN_ALERT_ERROR}>{error}</p>}

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting || percent === null}
              className={`${ADMIN_BUTTON_PRIMARY} w-full`}
            >
              {submitting ? "Confirmando…" : "Confirmar venta"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
