"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import QuantityControl from "@/components/store/QuantityControl";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { RESERVATION_HOURS } from "@/lib/storeConfig";
import { STORE_BUTTON, STORE_CAP, STORE_NARROW } from "@/lib/storeStyles";

export default function CartView() {
  const cart = useCart();

  return (
    <div className={STORE_NARROW}>
      <PageHeader title="Carrito" count={cart.count} back={{ href: "/", label: "Seguir comprando" }} />

      {cart.count === 0 ? (
        <div className="flex flex-col items-start gap-5">
          <p className="text-graphite">Tu carrito está vacío.</p>
          <Link href="/" className={STORE_BUTTON}>
            Ver fundas
          </Link>
        </div>
      ) : (
        <>
          <ul>
            {cart.items.map((item, index) => (
              <li
                key={item.variantId}
                className={`grid grid-cols-[88px_minmax(0,1fr)] gap-4 py-5 ${index > 0 ? "border-t border-rule" : ""}`}
              >
                <Link href={`/producto/${item.productId}`} className="block">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura guardada con el carrito (URL de Storage).
                    <img src={item.image} alt="" className="aspect-[4/5] w-[88px] object-cover" />
                  ) : (
                    <span className="block aspect-[4/5] w-[88px] bg-rule/40" />
                  )}
                </Link>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">
                    {item.name}
                  </span>
                  {item.detail && <span className="text-[15px] text-graphite">{item.detail}</span>}
                  <span className="font-mono text-[15px] tabular-nums text-ink">{formatPrice(item.price)}</span>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <QuantityControl
                      value={item.quantity}
                      max={item.max}
                      onChange={(q) => cart.setQuantity(item.variantId, q)}
                    />
                    <button
                      type="button"
                      onClick={() => cart.remove(item.variantId)}
                      className="min-h-11 text-[15px] text-graphite underline underline-offset-[3px]"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-5 border-t border-ink pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className={STORE_CAP}>Total</span>
              <span className="font-mono text-[32px] font-medium tabular-nums text-ink">
                {formatPrice(cart.total)}
              </span>
            </div>
            <p className="text-[15px] text-graphite">
              Pagás por transferencia. Al comprar te reservamos las fundas por {RESERVATION_HOURS} horas.
            </p>
            <Link href="/carrito/finalizar" className={`${STORE_BUTTON} w-full`}>
              Comprar
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
