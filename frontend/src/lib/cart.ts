"use client";

import { useSyncExternalStore } from "react";

// Carrito de la tienda, guardado en el navegador (localStorage). No reserva
// nada: el stock se aparta recién al confirmar la compra (reserva web).

export type CartItem = {
  variantId: string;
  productId: string;
  name: string;
  /** "iPhone 15 · rojo" (vacío si es universal y de color único). */
  detail: string;
  price: number;
  quantity: number;
  /** Stock que había al agregarlo: tope del +. */
  max: number;
  image: string | null;
};

const KEY = "lf-cart";
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: CartItem[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin storage (modo privado estricto): el carrito vive mientras dure la pestaña.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Otra pestaña cambió el carrito.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  return {
    items,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    total: items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    quantityOf: (variantId: string) => items.find((i) => i.variantId === variantId)?.quantity ?? 0,
    add(item: Omit<CartItem, "quantity">) {
      const current = read();
      const existing = current.find((i) => i.variantId === item.variantId);
      write(
        existing
          ? current.map((i) =>
              i.variantId === item.variantId
                ? { ...i, ...item, quantity: Math.min(item.max, i.quantity + 1) }
                : i,
            )
          : [...current, { ...item, quantity: 1 }],
      );
    },
    setQuantity(variantId: string, quantity: number) {
      write(read().map((i) => (i.variantId === variantId ? { ...i, quantity } : i)));
    },
    remove(variantId: string) {
      write(read().filter((i) => i.variantId !== variantId));
    },
    clear() {
      write([]);
    },
  };
}
