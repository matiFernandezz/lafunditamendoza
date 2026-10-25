"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const AUTO_ADVANCE_MS = 5000;

/**
 * Fotos de al lado del texto de Nosotros (las elige el panel › Tienda ›
 * Nosotros): pasan solas con un fundido y se eligen con las rayitas de abajo.
 * Con "reducir movimiento" no avanzan solas.
 */
export default function AboutCarousel({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (photos.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [photos.length, paused]);

  return (
    <div
      className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {photos.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === index ? alt : ""}
          fill
          priority={i === 0}
          sizes="(min-width: 768px) 45vw, 100vw"
          className={`object-cover transition-opacity duration-700 ease-out ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {photos.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-[linear-gradient(to_top,rgb(18_18_18/0.45),transparent)] pb-4 pt-10">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Foto ${i + 1} de ${photos.length}`}
              aria-current={i === index ? "true" : undefined}
              className="flex h-6 items-center"
            >
              <span
                className={`block h-[3px] rounded-full bg-paper transition-all duration-300 ${
                  i === index ? "w-8 opacity-100" : "w-4 opacity-50"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
