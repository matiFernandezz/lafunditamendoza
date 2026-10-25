"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** Evento para arrancar la barra desde código (p. ej. un router.replace que no es un link). */
const START_EVENT = "lf-navigation-start";

/** Avisa a la barra que empezó una navegación que no sale de un click en un link. */
export function startNavigationProgress() {
  window.dispatchEvent(new Event(START_EVENT));
}

type Phase = "idle" | "loading" | "done";

/**
 * La barrita fina que avanza al tocar un link, mientras carga la página nueva:
 * arranca al instante (al tocar), avanza rápido y después cada vez más lento, y
 * al llegar la página completa el ancho y se desvanece.
 */
function Bar({ className }: { className: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const [width, setWidth] = useState(0);
  const timers = useRef<number[]>([]);

  function clearTimers() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }

  // Llegó la página nueva (cambió la URL): completa y se va.
  const url = `${pathname}?${searchParams}`;
  const lastUrl = useRef(url);
  useEffect(() => {
    if (url === lastUrl.current) return;
    lastUrl.current = url;
    clearTimers();
    setPhase("done");
    setWidth(100);
    timers.current.push(window.setTimeout(() => setPhase("idle"), 400));
  }, [url]);

  useEffect(() => {
    function start() {
      clearTimers();
      setPhase("loading");
      setWidth(8);
      // Avanza rápido al principio y cada vez más lento, sin llegar al final.
      [
        [30, 25],
        [250, 55],
        [900, 75],
        [2500, 88],
      ].forEach(([ms, w]) => timers.current.push(window.setTimeout(() => setWidth(w), ms)));
      // Si por algo la página no cambia (p. ej. un link a la misma página), se va sola.
      timers.current.push(window.setTimeout(() => setPhase("idle"), 12000));
    }

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const next = new URL(link.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      // Solo un cambio de #ancla, o la misma página: no hay nada que cargar.
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      start();
    }

    // En captura: corre antes que el Link de Next, que cancela el click (preventDefault).
    document.addEventListener("click", onClick, true);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START_EVENT, start);
      clearTimers();
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden">
      <div
        className={`h-full origin-left ${className} ${phase === "idle" ? "opacity-0" : "opacity-100"}`}
        style={{
          width: phase === "idle" ? 0 : `${width}%`,
          transition:
            phase === "idle"
              ? "opacity 300ms ease"
              : `width ${phase === "done" ? 200 : 600}ms ease-out, opacity 300ms ease ${phase === "done" ? "200ms" : "0ms"}`,
        }}
      />
    </div>
  );
}

/**
 * Se ubica sobre el borde de abajo de su contenedor (que tiene que ser relative,
 * p. ej. el header). useSearchParams pide un Suspense alrededor.
 */
export default function NavigationProgress({ className = "bg-paper" }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <Bar className={className} />
    </Suspense>
  );
}
