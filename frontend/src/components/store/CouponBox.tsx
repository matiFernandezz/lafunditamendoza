"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";

/**
 * Campo de cupón del carrito: el código se revisa en el servidor y, si vale,
 * queda aplicado (el descuento se ve en el total). Al reservar, el servidor lo
 * vuelve a validar y es el que fija el descuento.
 */
export default function CouponBox() {
  const cart = useCart();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() === "" || checking) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/tienda/cupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data?.code) {
        setError(json?.error ?? "No pudimos revisar el cupón. Probá de nuevo en un rato.");
      } else {
        cart.applyCoupon({ code: json.data.code, percent: json.data.percent });
        setCode("");
      }
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
    } finally {
      setChecking(false);
    }
  }

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-ink px-4 py-3 text-[15px] text-ink">
        <span className="min-w-0">
          Cupón <span className="font-mono font-semibold">{cart.coupon.code}</span> · {cart.coupon.percent}% de
          descuento
        </span>
        <button
          type="button"
          onClick={() => cart.removeCoupon()}
          className="min-h-11 shrink-0 text-graphite underline underline-offset-[3px]"
        >
          Quitar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={apply} className="flex flex-col gap-2">
      <label htmlFor="cupon-codigo" className="text-[15px] text-graphite">
        ¿Tenés un cupón?
      </label>
      <div className="flex gap-2">
        <input
          id="cupon-codigo"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="Código del cupón"
          maxLength={40}
          className="h-12 min-w-0 flex-1 rounded-lg border border-rule bg-white px-4 font-mono text-base uppercase text-ink outline-none transition-colors duration-200 placeholder:font-sans placeholder:normal-case placeholder:text-graphite/70 focus:border-ink"
        />
        <button
          type="submit"
          disabled={code.trim() === "" || checking}
          className="h-12 shrink-0 rounded-lg border border-ink px-5 text-[15px] font-semibold text-ink transition-colors duration-200 hover:bg-ink hover:text-paper disabled:border-rule disabled:text-graphite disabled:hover:bg-transparent disabled:hover:text-graphite"
        >
          {checking ? "Revisando…" : "Aplicar"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[15px] text-ink">
          {error}
        </p>
      )}
    </form>
  );
}
