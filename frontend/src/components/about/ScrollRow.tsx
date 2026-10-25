"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, useEffect, useRef, useState } from "react";

// Flecha sutil sobre el borde de las fotos, centrada: círculo crema con borde
// suave que se invierte a tinta con el mouse. Solo desde md y al pasar por el
// carrusel (en el celular se desliza con el dedo); en la punta, se esconde.
const ARROW =
  "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-paper/90 text-ink opacity-0 shadow-[0_4px_14px_rgb(18_18_18/0.12)] transition-[opacity,background-color,color,border-color] duration-200 hover:border-ink hover:bg-ink hover:text-paper focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 md:flex";

/**
 * Carrusel de las redes en Nosotros: los elementos van uno al lado del otro y
 * se deslizan de costado (con el dedo o las flechas de los costados); cada uno
 * frena en su lugar. En mobile llega a los bordes de la pantalla.
 */
export default function ScrollRow({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  // Las flechas se apagan en las puntas.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () =>
      setEdges({
        start: track.scrollLeft <= 4,
        end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
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
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="group relative">
      <ul
        ref={trackRef}
        className="-mx-5 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          // relative: lo posicionado adentro (textos ocultos, íconos) queda dentro del carrusel.
          <li className="relative w-[min(340px,82vw)] shrink-0 snap-start">{child}</li>
        ))}
      </ul>
      {!(edges.start && edges.end) && (
        <>
          <button
            type="button"
            onClick={() => scroll(-1)}
            disabled={edges.start}
            aria-label="Anteriores"
            className={`${ARROW} left-3`}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            disabled={edges.end}
            aria-label="Siguientes"
            className={`${ARROW} right-3`}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </>
      )}
    </div>
  );
}
