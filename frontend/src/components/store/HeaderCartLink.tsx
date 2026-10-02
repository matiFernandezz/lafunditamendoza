"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart";

/** Acceso al carrito desde el header, en todas las páginas de la tienda. */
export default function HeaderCartLink() {
  const { count } = useCart();

  return (
    <Link
      href="/carrito"
      aria-label={count > 0 ? `Carrito, ${count} ${count === 1 ? "producto" : "productos"}` : "Carrito vacío"}
      className="relative flex size-11 shrink-0 items-center justify-center text-paper/85 transition-colors duration-200 hover:text-paper focus-visible:outline-paper"
    >
      <ShoppingBag aria-hidden="true" className="size-6" strokeWidth={1.75} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-paper px-1 font-mono text-[11px] font-bold leading-none text-ink"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
