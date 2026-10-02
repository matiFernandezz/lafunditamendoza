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
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex h-[60px] w-[calc(min(100%,430px)-32px)] -translate-x-1/2 items-center justify-between rounded-full bg-ink px-6 text-paper shadow-[0_10px_30px_rgb(0_0_0/0.22)] md:left-auto md:right-8 md:w-[360px] md:translate-x-0"
    >
      <span className="text-base font-medium">Ver carrito ({count})</span>
      <span className="font-mono text-[17px] tabular-nums">{formatPrice(total)}</span>
    </Link>
  );
}
