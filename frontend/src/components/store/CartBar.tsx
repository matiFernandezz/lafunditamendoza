"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

/** Barra fija "Ver carrito (n) · $" mientras haya algo en el carrito. */
export default function CartBar() {
  const pathname = usePathname();
  const { count, total } = useCart();

  // En las pantallas de compra ya se ve el carrito.
  if (count === 0 || pathname.startsWith("/carrito") || pathname.startsWith("/reserva")) return null;

  return (
    <Link
      href="/carrito"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 inline-flex h-12 -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-ink px-5 text-paper shadow-[0_8px_24px_rgb(0_0_0/0.2)] md:left-auto md:right-8 md:translate-x-0"
    >
      <span className="text-[15px] font-medium">Ver carrito ({count})</span>
      <span aria-hidden="true" className="h-4 w-px bg-paper/30" />
      <span className="font-mono text-[15px] tabular-nums">{formatPrice(total)}</span>
    </Link>
  );
}
