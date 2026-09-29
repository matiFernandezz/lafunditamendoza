"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type HeroSlide = {
  id: string;
  src: string;
  alt: string;
  /** object-position de la foto (por defecto "center"). */
  position?: string;
  /** Oscurece la foto (0.5–0.6) cuando lleva logo o texto encima. */
  dim?: number;
  /** Contenido propio del slide (titular, CTA, logo), ya posicionado. */
  content?: React.ReactNode;
};

const AUTO_ADVANCE_MS = 6000;

/**
 * Hero carrusel a sangre del diseño: crossfade de 700ms cada 6s, flechas
 * circulares a los costados y contador "01 / 04" con barra abajo a la
 * derecha. Cambiar a mano reinicia el temporizador. Con reduced-motion no
 * avanza solo (las flechas siguen andando).
 */
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [count, index]);

  if (count === 0) return null;

  const arrow =
    "absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/28 pb-[3px] text-[26px] leading-none text-paper backdrop-blur-[6px] transition-colors duration-200 hover:bg-ink/45";

  return (
    <div className="absolute inset-0">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          inert={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
            style={{
              objectPosition: slide.position ?? "center",
              filter: slide.dim ? `brightness(${slide.dim})` : undefined,
            }}
          />
          {slide.content && <div className="absolute inset-0">{slide.content}</div>}
        </div>
      ))}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide anterior"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            className={`${arrow} left-2`}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Slide siguiente"
            onClick={() => setIndex((i) => (i + 1) % count)}
            className={`${arrow} right-2`}
          >
            ›
          </button>
          <div className="absolute bottom-6 right-5 z-10 flex items-center gap-3 text-paper sm:right-6 lg:right-10 xl:right-16">
            <div className="h-px w-16 overflow-hidden bg-paper/40">
              <div
                className="h-full bg-paper transition-[width] duration-500"
                style={{ width: `${((index + 1) / count) * 100}%` }}
              />
            </div>
            <span className="font-mono text-sm tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
