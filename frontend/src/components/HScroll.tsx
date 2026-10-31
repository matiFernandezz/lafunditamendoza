"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Borde que se funde con el papel de la tarjeta, con una flecha chica: avisa que
// la fila sigue (sin esto, un selector cortado en el 16 parece no tener 17 ni 18).
const EDGE =
  "absolute inset-y-0 z-10 flex w-12 items-center text-ink transition-opacity duration-200 hover:text-ink/70";

/**
 * Fila que se desliza de costado, con un borde difuminado y una flecha del lado
 * donde hay más (se apagan en las puntas). Al abrirse deja a la vista el
 * elemento marcado con data-active="true".
 */
export default function HScroll({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Si el elegido queda fuera de la vista, se lo trae al centro; sin pasarse de los extremos
    // (un scroll negativo, en Safari de iPhone, deja un hueco en blanco a la izquierda).
    const active = track.querySelector<HTMLElement>('[data-active="true"]');
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    if (active) {
      const hidden = active.offsetLeft < track.scrollLeft || active.offsetLeft + active.offsetWidth > track.scrollLeft + track.clientWidth;
      if (hidden) track.scrollLeft = Math.min(max, Math.max(0, active.offsetLeft - (track.clientWidth - active.offsetWidth) / 2));
    }

    const update = () =>
      setEdges({
        start: track.scrollLeft <= 2,
        end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2,
      });
    update();
    track.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  function scroll(direction: -1 | 1) {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className="relative min-w-0">
      <div
        ref={trackRef}
        className={`relative flex min-w-0 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(-1)}
        tabIndex={edges.start ? -1 : 0}
        aria-label="Ver los anteriores"
        aria-hidden={edges.start}
        className={`${EDGE} left-0 justify-start bg-[linear-gradient(to_right,var(--paper)_35%,transparent)] ${
          edges.start ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        tabIndex={edges.end ? -1 : 0}
        aria-label="Ver los siguientes"
        aria-hidden={edges.end}
        className={`${EDGE} right-0 justify-end bg-[linear-gradient(to_left,var(--paper)_35%,transparent)] ${
          edges.end ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2.25} />
      </button>
    </div>
  );
}
