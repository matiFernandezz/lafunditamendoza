import type { KeyboardEvent } from "react";

/** Marca un input como "cantidad" de la grilla de compra. */
export const QUANTITY_INPUT = { "data-purchase-qty": "" };

/**
 * Enter o Tab en una cantidad salta a la cantidad de la fila siguiente (de
 * este producto o del próximo): se cargan todas de corrido sin pasar por el
 * costo. En la última, Tab sigue su camino normal.
 */
export function handleQuantityKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter" && !(e.key === "Tab" && !e.shiftKey)) return;
  const all = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[data-purchase-qty]:not(:disabled)"),
  );
  const next = all[all.indexOf(e.currentTarget) + 1];
  if (!next) return;
  e.preventDefault();
  next.focus();
  next.select();
}
