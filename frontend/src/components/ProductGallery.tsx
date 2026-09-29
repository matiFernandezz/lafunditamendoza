"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImage } from "@/lib/catalog";

const THUMBNAIL_THRESHOLD = 2;

// Marco de la foto: rectángulo con esquinas apenas redondeadas (12px), cuadrado
// pero con tope. Mobile: todo el ancho y como mucho 360px de alto. Desktop: como
// mucho 440×440 (la columna tampoco pasa de 440px). object-cover adentro.
const FRAME =
  "relative aspect-square w-full max-h-[360px] overflow-hidden rounded-xl bg-rule/40 md:max-h-[440px] md:max-w-[440px]";
const SIZES = "(min-width: 768px) 440px, 100vw";

// Detalle de producto: una sola foto se muestra fija sin controles; con más
// de una, scroll horizontal con snap (swipe nativo en mobile) + flechas y
// puntos, más una fila de thumbnails debajo si hay más de 2 fotos.
export default function ProductGallery({
  images,
  alt,
}: {
  images: ProductImage[];
  alt: string;
}) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (sorted.length === 0) {
    return <div className={`${FRAME} flex items-center justify-center text-graphite`}>Sin foto</div>;
  }

  if (sorted.length === 1) {
    return (
      <div className={FRAME}>
        <Image src={sorted[0].url} alt={alt} fill sizes={SIZES} className="object-cover" priority />
      </div>
    );
  }

  function scrollToIndex(i: number) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="space-y-3 md:max-w-[440px]">
      <div className="relative">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className={`${FRAME} flex snap-x snap-mandatory overflow-x-auto`}
        >
          {sorted.map((img, i) => (
            <div key={img.id} className="relative h-full w-full shrink-0 snap-start">
              <Image
                src={img.url}
                alt={alt}
                fill
                sizes={SIZES}
                className="object-cover"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollToIndex(Math.max(0, active - 1))}
          aria-label="Foto anterior"
          disabled={active === 0}
          className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink disabled:opacity-40 md:flex"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(Math.min(sorted.length - 1, active + 1))}
          aria-label="Foto siguiente"
          disabled={active === sorted.length - 1}
          className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink disabled:opacity-40 md:flex"
        >
          ›
        </button>
      </div>

      {sorted.length > THUMBNAIL_THRESHOLD ? (
        <div className="flex gap-2 overflow-x-auto">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Ir a la foto ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition-colors ${
                i === active ? "border-ink" : "border-rule"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex justify-center gap-1.5">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Ir a la foto ${i + 1}`}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === active ? "bg-ink" : "bg-rule"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
