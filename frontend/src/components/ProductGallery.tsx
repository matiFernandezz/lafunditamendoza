"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImage } from "@/lib/catalog";

// Marco de la foto: cuadrado con esquinas apenas redondeadas (12px) y
// object-cover adentro. El ancho lo da la columna (ver ProductDetail).
const FRAME = "relative aspect-square w-full overflow-hidden rounded-xl bg-rule/40";
// Lo que ocupa la foto en pantalla: en desktop ~450px, en mobile casi todo el
// ancho. El navegador pide el doble en pantallas retina.
const SIZES = "(min-width: 768px) 450px, 100vw";
// Calidad de la foto grande (la default de Next, 75, lava los detalles).
// Tiene que estar en images.qualities de next.config.ts.
const QUALITY = 90;

const ARROW =
  "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-xl leading-none text-ink transition-opacity duration-200 disabled:opacity-40";
const SWIPE_MIN = 40;

// Detalle de producto: una sola foto se muestra fija sin controles. Con más
// de una, las miniaturas van en una columna a la izquierda de la foto y se
// cambia con las flechas, tocando una miniatura o deslizando el dedo. No hay
// scroll horizontal: se muestra una foto por vez.
export default function ProductGallery({
  images,
  alt,
}: {
  images: ProductImage[];
  alt: string;
}) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (sorted.length === 0) {
    return <div className={`${FRAME} flex items-center justify-center text-graphite`}>Sin foto</div>;
  }

  if (sorted.length === 1) {
    return (
      <div className={FRAME}>
        <Image src={sorted[0].url} alt={alt} fill sizes={SIZES} quality={QUALITY} className="object-cover" priority />
      </div>
    );
  }

  // Si se borra una foto desde el panel, el índice puede quedar fuera de rango.
  const active = Math.min(index, sorted.length - 1);
  const go = (next: number) => setIndex(Math.max(0, Math.min(sorted.length - 1, next)));

  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-2 md:grid-cols-[64px_minmax(0,1fr)] md:gap-3">
      {/* La columna de miniaturas no supera el alto de la foto: si hay muchas,
          se desplaza en vertical sin barra. */}
      <div className="relative self-stretch">
        <ul className="absolute inset-0 flex flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sorted.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver la foto ${i + 1}`}
                aria-current={i === active}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg border transition-colors duration-200 ${
                  i === active ? "border-ink" : "border-rule hover:border-graphite"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={FRAME}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const delta = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) >= SWIPE_MIN) go(active + (delta < 0 ? 1 : -1));
        }}
      >
        {/* Todas montadas y apiladas: cambiar de foto no espera una descarga. */}
        {sorted.map((img, i) => (
          <Image
            key={img.id}
            src={img.url}
            alt={i === active ? alt : ""}
            aria-hidden={i === active ? undefined : true}
            fill
            sizes={SIZES}
            quality={QUALITY}
            priority={i === 0}
            className={`object-cover transition-opacity duration-200 motion-reduce:transition-none ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        <button
          type="button"
          onClick={() => go(active - 1)}
          aria-label="Foto anterior"
          disabled={active === 0}
          className={`${ARROW} left-2 md:left-3`}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => go(active + 1)}
          aria-label="Foto siguiente"
          disabled={active === sorted.length - 1}
          className={`${ARROW} right-2 md:right-3`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
