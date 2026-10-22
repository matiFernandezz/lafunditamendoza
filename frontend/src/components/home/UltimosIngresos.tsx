"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/catalog";
import ProductTile from "../ProductTile";
import HomeSectionTitle from "./HomeSectionTitle";

// Cada cuánto avanza sola de a una card (se pausa con el mouse, el foco o el dedo encima).
const AUTO_ADVANCE_MS = 5000;

/**
 * Corre la tira una card (el ancho de la primera + el espacio entre cards).
 * Con `loop`, desde el final vuelve al principio.
 */
function stepTrack(track: HTMLUListElement | null, direction: 1 | -1, loop: boolean) {
  const first = track?.firstElementChild as HTMLElement | null;
  if (!track || !first) return;
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  if (loop && direction === 1 && atEnd) {
    track.scrollTo({ left: 0, behavior: "smooth" });
    return;
  }
  track.scrollBy({ left: direction * (first.offsetWidth + gap), behavior: "smooth" });
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="size-5">
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

// Flecha sobre el borde de las fotos: círculo papel con borde regla que se
// invierte a tinta al pasar el mouse (regla de inversión del diseño). Solo
// desde md y al pasar por la tira; en el celular se desliza con el dedo.
const ARROW =
  "absolute top-[calc(50%-1.75rem)] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-paper text-ink opacity-0 transition-[opacity,background-color,color,border-color] duration-200 hover:border-ink hover:bg-ink hover:text-paper focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 md:flex";

/**
 * "Últimos ingresos": lo último que se cargó, en una tira horizontal con fotos
 * de tamaño de tienda (4 por pantalla en la compu, de 240px como mucho: la tira
 * no pasa de 4 cards de ancho; 3 en tablet y 2 y algo en
 * el celular). Avanza sola de a una card cada 5 s y
 * se pausa al interactuar; al llegar al final vuelve al principio.
 */
export default function UltimosIngresos({
  products,
  title,
  allHref,
}: {
  products: Product[];
  title: string;
  allHref: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });

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
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (paused || products.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => stepTrack(trackRef.current, 1, true), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, products.length]);

  if (products.length === 0) return null;
  const scrolls = !(edges.start && edges.end);

  return (
    <section aria-label={title} className="flex flex-col gap-5 lg:gap-7">
      <HomeSectionTitle action={{ href: allHref, label: "Ver todo" }}>{title}</HomeSectionTitle>

      <div
        className="group relative lg:mx-auto lg:w-full lg:max-w-[1008px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
      >
        <ul
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] md:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <li
              key={product.id}
              className="w-[44%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
            >
              <ProductTile product={product} />
            </li>
          ))}
        </ul>

        {scrolls && (
          <>
            <button
              type="button"
              onClick={() => stepTrack(trackRef.current, -1, false)}
              disabled={edges.start}
              aria-label="Anteriores"
              className={`${ARROW} -left-3`}
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              onClick={() => stepTrack(trackRef.current, 1, true)}
              aria-label="Siguientes"
              className={`${ARROW} -right-3`}
            >
              <Chevron direction="right" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
