"use client";

import { formatPrice } from "@/lib/format";
import type { CartItem, PaymentMethod } from "./types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
];

export default function CartPanel({
  items,
  open,
  onOpenChange,
  paymentMethod,
  onPaymentMethodChange,
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
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <>
      {/* Barra flotante para abrir la venta actual (solo mobile, solo si hay items) */}
      {!open && itemCount > 0 && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed inset-x-4 bottom-4 z-20 flex h-16 items-center justify-between rounded-2xl bg-zinc-900 px-5 text-white shadow-lg active:bg-zinc-800 md:hidden"
        >
          <span className="font-medium">
            {itemCount} {itemCount === 1 ? "producto" : "productos"}
          </span>
          <span className="text-lg font-bold">{formatPrice(total)}</span>
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
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        } md:sticky md:top-20 md:z-auto md:h-[calc(100vh-6rem)] md:max-h-none md:w-80 md:shrink-0 lg:w-96 md:translate-y-0 md:rounded-2xl md:border md:shadow-none`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Venta actual</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-zinc-500 active:bg-zinc-100 md:hidden"
            aria-label="Cerrar venta actual"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-center text-sm text-zinc-500">
            Todavía no agregaste productos a la venta.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 divide-y divide-zinc-100">
            {items.map((item) => (
              <li key={item.variantId} className="flex items-start justify-between gap-3 pt-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{item.productName}</p>
                  <p className="break-words text-sm text-zinc-500">{item.variantLabel}</p>
                  <p className="mt-1 text-sm font-medium">{formatPrice(item.price)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-lg font-medium active:bg-zinc-100"
                      aria-label="Restar"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.stockQuantity}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-lg font-medium active:bg-zinc-100 disabled:opacity-30"
                      aria-label="Sumar"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.variantId)}
                    className="min-h-11 px-1 text-sm text-zinc-500 underline underline-offset-2"
                  >
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
              <p className="mb-1 text-sm font-medium text-zinc-700">Medio de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => onPaymentMethodChange(m.value)}
                    className={`h-12 rounded-xl border text-sm font-semibold ${
                      paymentMethod === m.value
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 active:bg-zinc-100"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="h-14 w-full rounded-xl bg-zinc-900 text-base font-semibold text-white active:bg-zinc-800 disabled:bg-zinc-400"
            >
              {submitting ? "Confirmando…" : "Confirmar venta"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
