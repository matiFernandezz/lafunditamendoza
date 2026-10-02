"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CartView from "@/components/store/CartView";
import PageHeader from "@/components/PageHeader";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { STORE_BUTTON, STORE_CAP, STORE_NARROW } from "@/lib/storeStyles";

const INPUT =
  "h-14 w-full rounded-lg border border-rule bg-white px-4 text-base text-ink outline-none transition-colors duration-200 placeholder:text-graphite/70 focus:border-ink";

export default function CheckoutView() {
  const router = useRouter();
  const cart = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 8;

  if (cart.count === 0 && !submitting) return <CartView />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tienda/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          items: cart.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data?.public_token) {
        setError(json?.error ?? "No pudimos hacer la reserva. Probá de nuevo en un rato.");
        setSubmitting(false);
        return;
      }
      router.push(`/reserva/${json.data.public_token}`);
      cart.clear();
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={STORE_NARROW}>
      <PageHeader title="Finalizar compra" back={{ href: "/carrito", label: "Carrito" }} />

      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="compra-nombre" className="mb-2 block font-medium text-ink">
            Tu nombre
          </label>
          <input
            id="compra-nombre"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre y apellido"
            maxLength={80}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="compra-whatsapp" className="mb-2 block font-medium text-ink">
            Tu WhatsApp
          </label>
          <input
            id="compra-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="261 555 1234"
            maxLength={25}
            className={INPUT}
          />
          <p className="mt-1.5 text-sm text-graphite">
            Te escribimos por acá para confirmar el pago y coordinar la entrega.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-rule pt-5">
        {cart.items.map((i) => (
          <div key={i.variantId} className="flex justify-between gap-3 text-[15px] text-ink">
            <span className="min-w-0">
              {i.name}{" "}
              <span className="text-graphite">
                {i.detail ? `· ${i.detail} ` : ""}×{i.quantity}
              </span>
            </span>
            <span className="shrink-0 font-mono tabular-nums">{formatPrice(i.quantity * i.price)}</span>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-ink pt-4">
          <span className={STORE_CAP}>Total</span>
          <span className="font-mono text-[28px] font-medium tabular-nums text-ink">{formatPrice(cart.total)}</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-ink px-4 py-3 text-[15px] text-ink">
          {error}
        </p>
      )}

      <button type="submit" disabled={!ready || submitting} className={`${STORE_BUTTON} w-full`}>
        {submitting ? "Reservando…" : "Reservar y ver datos de pago"}
      </button>
    </form>
  );
}
