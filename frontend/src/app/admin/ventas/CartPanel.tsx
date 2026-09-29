"use client";

import { Banknote, Check, ChevronUp, Landmark, Minus, Plus, X, type LucideIcon } from "lucide-react";
import { formatPrice } from "@/lib/format";
import AdminNotice from "../AdminNotice";
import {
  ADMIN_CAP,
  ADMIN_INPUT_ADORNMENT,
  ADMIN_INSET,
  ADMIN_LABEL,
  adminButton,
  adminIconButton,
  adminInput,
  adminSegment,
} from "../adminStyles";
import type { CartItem, DiscountChoice, PaymentMethod } from "./types";
import { MAX_DISCOUNT_PERCENT, discountAmount, resolveDiscount } from "./utils";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "transferencia", label: "Transferencia", icon: Landmark },
];

// Los que se usan con amigos; cualquier otro va por "Otro".
const DISCOUNT_PRESETS = [10, 15, 20];

function Stepper({
  quantity,
  max,
  onChange,
}: {
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1">
      {/* Bajar a 0 saca el producto de la venta. */}
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label="Restar uno"
        title="Restar uno"
        className={adminIconButton()}
      >
        <Minus aria-hidden="true" className="size-5" />
      </button>
      <span className="min-w-8 text-center font-mono text-[17px] font-semibold tabular-nums text-admin-text">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max}
        aria-label="Sumar uno"
        title="Sumar uno"
        className={adminIconButton()}
      >
        <Plus aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 text-[15px] ${muted ? "text-admin-muted" : "text-admin-text"}`}
    >
      <span>{label}</span>
      <span className="font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * La venta en curso. Desktop/tablet: tarjeta fija al costado de la grilla.
 * Mobile: barra flotante "Ver venta" (arriba de la navegación inferior) que
 * abre la misma venta en una hoja desde abajo.
 */
export default function CartPanel({
  items,
  open,
  onOpenChange,
  paymentMethod,
  onPaymentMethodChange,
  discount,
  onDiscountChange,
  onUpdateQuantity,
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
      {!open && itemCount > 0 && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed inset-x-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-[35] flex h-[60px] items-center justify-between rounded-md bg-admin-ink pl-[18px] pr-4 text-white shadow-[0_8px_24px_rgb(0_0_0/0.18)] md:hidden"
        >
          <span className="flex items-center gap-2.5 text-[15px] font-semibold">
            <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-white px-1.5 font-mono text-sm font-bold text-black">
              {itemCount}
            </span>
            Ver venta
          </span>
          <span className="flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums">
            {formatPrice(total)}
            <ChevronUp aria-hidden="true" className="size-5" />
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-40 bg-black/45 md:hidden" onClick={() => onOpenChange(false)} />
      )}

      <aside
        aria-label="Venta actual"
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[14px] bg-white px-4 pb-6 pt-2 transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        } md:sticky md:top-[72px] md:z-auto md:max-h-[calc(100vh-6rem)] md:w-[360px] md:shrink-0 md:translate-y-0 md:rounded-md md:border md:border-admin-border md:p-5 lg:top-[88px] lg:w-[400px]`}
      >
        <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded bg-admin-border-strong md:hidden" />

        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-admin-text md:text-lg">
            Venta actual
          </h2>
          {itemCount > 0 && (
            <span className="hidden text-[13px] text-admin-muted md:inline">
              {itemCount === 1 ? "1 producto" : `${itemCount} productos`}
            </span>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
            title="Cerrar"
            className={`${adminIconButton("plain")} md:hidden`}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="my-5 text-center text-sm text-admin-muted">
            Todavía no agregaste productos. Tocá un modelo para sumarlo.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-5">
            <ul className="divide-y divide-admin-border">
              {items.map((item) => (
                <li key={item.variantId} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[15px] font-semibold text-admin-text">{item.productName}</p>
                    <p className="mt-0.5 break-words text-[13px] text-admin-muted">{item.variantLabel}</p>
                    <p className="mt-1 font-mono text-sm tabular-nums text-admin-text">{formatPrice(item.price)}</p>
                  </div>
                  <Stepper
                    quantity={item.quantity}
                    max={item.stockQuantity}
                    onChange={(q) => onUpdateQuantity(item.variantId, q)}
                  />
                </li>
              ))}
            </ul>

            <div>
              <p className={ADMIN_LABEL}>Descuento</p>
              <div role="radiogroup" aria-label="Descuento" className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={discount.kind === "none"}
                  aria-label="Sin descuento"
                  onClick={() => onDiscountChange({ kind: "none" })}
                  className={adminSegment(discount.kind === "none")}
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
                      className={adminSegment(active)}
                    >
                      {p}%
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={discount.kind === "custom"}
                  onClick={() => discount.kind !== "custom" && onDiscountChange({ kind: "custom", text: "" })}
                  className={adminSegment(discount.kind === "custom")}
                >
                  Otro
                </button>
              </div>
              {discount.kind === "custom" && (
                <div className="mt-2">
                  <label htmlFor="descuento-otro" className="sr-only">
                    Otro porcentaje
                  </label>
                  <div className="relative">
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
                      placeholder="Escribí el porcentaje"
                      className={adminInput({ suffix: true, mono: true })}
                    />
                    <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} right-3.5`}>
                      %
                    </span>
                  </div>
                  {percent === null && (
                    <p className="mt-1.5 text-[13px] text-admin-muted">
                      Poné un número entero entre 1 y {MAX_DISCOUNT_PERCENT}.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className={`${ADMIN_INSET} flex flex-col gap-2`}>
              <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
              <SummaryRow
                label={discounted > 0 ? `Descuento ${percent}%` : "Descuento"}
                value={discounted > 0 ? `− ${formatPrice(discounted)}` : "—"}
                muted={discounted === 0}
              />
              <div className="my-1 border-t border-admin-border" />
              <div className="flex items-baseline justify-between gap-3">
                <span className={ADMIN_CAP}>Total a cobrar</span>
                <span className="font-mono text-[2rem] font-bold leading-none tabular-nums text-admin-text">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            <div>
              <p className={ADMIN_LABEL}>Medio de pago</p>
              <div role="radiogroup" aria-label="Medio de pago" className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === m.value}
                    onClick={() => onPaymentMethodChange(m.value)}
                    className={adminSegment(paymentMethod === m.value, "lg")}
                  >
                    <m.icon aria-hidden="true" className="size-5" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <AdminNotice kind="danger">{error}</AdminNotice>}

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting || percent === null}
              className={`${adminButton("primary", "lg")} w-full`}
            >
              <Check aria-hidden="true" className="size-[22px]" />
              {submitting ? "Cobrando…" : `Cobrar ${formatPrice(total)}`}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
