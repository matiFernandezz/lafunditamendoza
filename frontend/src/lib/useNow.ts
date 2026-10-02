"use client";

import { useSyncExternalStore } from "react";

// Hora actual que se refresca cada 30 s, para cuentas regresivas. En el
// servidor (y en la primera pasada de hidratación) es null: así el HTML del
// servidor y el del navegador coinciden y la cuenta aparece al montar.

const TICK_MS = 30_000;
let now = 0;

function subscribe(onChange: () => void) {
  now = Date.now();
  const timer = setInterval(() => {
    now = Date.now();
    onChange();
  }, TICK_MS);
  return () => clearInterval(timer);
}

export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    // Tiene que devolver el mismo valor entre ticks (si no, React re-renderiza en loop).
    () => (now ||= Date.now()),
    () => null,
  );
}

export function timeLeftText(ms: number): string {
  if (ms <= 0) return "0 min";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}
