"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImage } from "@/lib/catalog";

// Marco de la foto: cuadrado con esquinas apenas redondeadas (12px) y
// object-cover adentro. El ancho lo da la columna (ver ProductDetail).
const FRAME = "relative aspect-square w-full overflow-hidden rounded-xl bg-rule/40";
const WITH_THUMBS = "grid grid-cols-[56px_minmax(0,1fr)] items-start gap-2 md:grid-cols-[64px_minmax(0,1fr)] md:gap-3";

const ARROW =
  "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-xl leading-none text-ink transition-opacity duration-200 disabled:opacity-40";
const SWIPE_MIN = 40;

// Detalle de producto: una sola foto se muestra fija sin controles. Con más
// de una, las miniaturas van en una columna a la izquierda de la foto y se
// cambia con las flechas, tocando una miniatura o deslizando el dedo. No hay
// scroll horizontal: se muestra una foto por vez.
//
// `images` son las fotos a mostrar ahora (las del color elegido). Cuando
// cambian, la galería vuelve a la primera con un fundido.
//
// La foto grande va `unoptimized`: se sirve el archivo tal cual se subió, sin
// que Next lo achique ni lo recomprima. Las miniaturas sí se optimizan.
export default function ProductGallery({
  images,
  alt,
  reserveThumbs = false,
}: {
  images: ProductImage[];
  alt: string;
  /**
   * Dejar siempre el lugar de la columna de miniaturas, aunque ahora haya una
   * sola foto: así la foto no cambia de tamaño al pasar de un color con
   * varias fotos a uno con una.
   */
  reserveThumbs?: boolean;
}) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const [index, setIndex] = useState(0);
  // Fotos que ya se mostraron: quedan montadas para volver sin esperar. Las
  // demás no se piden hasta que se eligen (son los originales, pueden pesar).
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const touchStartX = useRef<number | null>(null);

  // Otro juego de fotos (se eligió otro color): arranca de la primera. Se
  // ajusta durante el render, no en un efecto.
  const setKey = sorted.map((img) => img.id).join(",");
  const [prevSetKey, setPrevSetKey] = useState(setKey);
  if (prevSetKey !== setKey) {
    setPrevSetKey(setKey);
    setIndex(0);
    setVisited(new Set());
  }

  if (sorted.length === 0) {
    return <div className={`${FRAME} flex items-center justify-center text-graphite`}>Sin foto</div>;
  }

  if (sorted.length === 1 && !reserveThumbs) {
    return (
      <div className={FRAME}>
        <Image
          key={sorted[0].id}
          src={sorted[0].url}
          alt={alt}
          fill
          unoptimized
          className="object-cover motion-safe:animate-[lf-fade-in_200ms_ease-out]"
          priority
        />
      </div>
    );
  }

  // Si se borra una foto desde el panel, el índice puede quedar fuera de rango.
  const active = Math.min(index, sorted.length - 1);
  const many = sorted.length > 1;

  function go(next: number) {
    const target = Math.max(0, Math.min(sorted.length - 1, next));
    setIndex(target);
    setVisited((prev) => (prev.has(sorted[target].id) ? prev : new Set(prev).add(sorted[target].id)));
  }

  return (
    <div className={WITH_THUMBS}>
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
                <Image src={img.url} alt="" fill sizes="64px" quality={90} className="object-cover" />
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
        {sorted.map((img, i) =>
          i === active || i === 0 || visited.has(img.id) ? (
            <Image
              key={img.id}
              src={img.url}
              alt={i === active ? alt : ""}
              aria-hidden={i === active ? undefined : true}
              fill
              unoptimized
              priority={i === 0}
              className={`object-cover transition-opacity duration-200 motion-reduce:transition-none ${
                i === 0 ? "motion-safe:animate-[lf-fade-in_200ms_ease-out]" : ""
              } ${i === active ? "opacity-100" : "opacity-0"}`}
            />
          ) : null,
        )}

        {many && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
