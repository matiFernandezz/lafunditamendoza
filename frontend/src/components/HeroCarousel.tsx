"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type HeroSlide = { id: string; src: string; alt: string };

const AUTO_ADVANCE_MS = 6000;

// Capa de fondo del hero: fotos reales (no product_images, son renders de
// marca en public/hero/), crossfade automático + flechas manuales. Con una
// sola foto no muestra controles ni indicador, igual criterio que la
// galería del detalle de producto. Sin gradiente propio: las piezas ya
// vienen con su propio contraste resuelto (ver comentario en page.tsx). El
// contenedor llega con pointer-events-none (hay un link de "ver todo" atrás
// cubriendo todo el bloque), así que los controles reactivan pointer-events
// puntualmente para seguir siendo clickeables.
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="absolute inset-0">
      {slides.map((slide, i) => (
        <Image
          key={slide.id}
          src={slide.src}
          alt={slide.alt}
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {slides.length > 1 && (
        <div className="pointer-events-auto absolute bottom-6 left-6 flex items-center gap-3 text-paper sm:bottom-10 sm:left-10">
          <span className="font-mono text-sm tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
          <div className="h-px w-16 overflow-hidden bg-paper/30">
            <div
              className="h-full bg-paper transition-all duration-500"
              style={{ width: `${((index + 1) / slides.length) * 100}%` }}
            />
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
              aria-label="Foto anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/40 text-paper transition-colors duration-200 hover:bg-paper/10"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              aria-label="Foto siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/40 text-paper transition-colors duration-200 hover:bg-paper/10"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
