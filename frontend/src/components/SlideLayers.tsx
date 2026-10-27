import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import ArrowMark from "@/components/ArrowMark";
import type { DeviceLayout, SlideElement, SlideShade } from "@/lib/slideLayout";

// Dibuja el diseño de una foto del carrusel (lo que se armó en el editor del
// panel) encima de la foto. Lo usan la home y la vista previa del editor, así
// lo que se ve en el panel es lo mismo que sale en la tienda. Las medidas van
// en cqw/%: el contenedor es la foto, y todo escala con ella.

/** El degradé oscuro de cada opción de "Sombra". */
export const SHADE_BACKGROUND: Record<SlideShade, string | undefined> = {
  ninguna: undefined,
  arriba: "linear-gradient(to bottom, rgb(18 18 18 / 0.6), transparent 55%)",
  abajo: "linear-gradient(to top, rgb(18 18 18 / 0.78) 0%, rgb(18 18 18 / 0.35) 45%, rgb(18 18 18 / 0.05) 75%)",
  izquierda: "linear-gradient(to right, rgb(18 18 18 / 0.65), transparent 60%)",
  derecha: "linear-gradient(to left, rgb(18 18 18 / 0.65), transparent 60%)",
  pareja: "linear-gradient(rgb(18 18 18 / 0.3), rgb(18 18 18 / 0.3))",
};

const ALIGN_SHIFT = { left: undefined, center: "translateX(-50%)", right: "translateX(-100%)" } as const;

/**
 * Dónde va un elemento. La alineación dice qué borde queda en x (izquierdo,
 * centro o derecho), así crece hacia el lado contrario. `fromBottom`: los de la
 * mitad de abajo se anclan al borde inferior (en pantallas más bajas que la de
 * referencia no se salen de la foto).
 */
export function elementPlacement(el: SlideElement, fromBottom: boolean): CSSProperties {
  const anchorBottom = fromBottom && el.y + el.h / 2 > 50;
  return {
    left: `${el.x}%`,
    ...(anchorBottom ? { bottom: `${100 - el.y - el.h}%` } : { top: `${el.y}%` }),
    transform: ALIGN_SHIFT[el.align],
    ...(el.type === "logo" ? { width: `${el.size}cqw` } : { fontSize: `${el.size}cqw` }),
    // Texto con caja de ancho fijo: se acomoda en renglones dentro de ella.
    ...(el.type === "texto" && el.w !== undefined ? { width: `${el.w}cqw` } : {}),
  };
}

const TEXT_STYLE = {
  titulo: "font-display font-semibold leading-[0.95] tracking-[-0.03em]",
  etiqueta: "font-semibold uppercase leading-[1.2] tracking-label",
  bajada: "font-light leading-[1.35]",
} as const;

const ALIGN_TEXT = { left: "text-left", center: "text-center", right: "text-right" } as const;
const ALIGN_ROW = { left: "justify-start", center: "justify-center", right: "justify-end" } as const;

/** El contenido de un elemento (sin ubicar). `linkable`: false en el editor (los links no navegan). */
export function SlideElementView({ el, linkable = true }: { el: SlideElement; linkable?: boolean }) {
  const color = el.color === "oscuro" ? "text-ink" : "text-paper";
  switch (el.type) {
    case "texto": {
      const className = `${el.w !== undefined ? "whitespace-pre-line" : "whitespace-pre"} ${TEXT_STYLE[el.style]} ${ALIGN_TEXT[el.align]} ${color} ${
        el.style === "bajada" && el.color === "claro" ? "text-paper/90" : ""
      }`;
      return el.style === "titulo" ? <h2 className={className}>{el.text}</h2> : <p className={className}>{el.text}</p>;
    }
    case "logo":
      return (
        <Image
          src="/brand/logo-trimmed.png"
          alt="La Fundita"
          width={836}
          height={949}
          sizes={`${Math.max(8, Math.ceil(el.size * 1.5))}vw`}
          className="block h-auto w-full"
          style={el.color === "oscuro" ? { filter: "brightness(0)" } : undefined}
          draggable={false}
        />
      );
    case "link": {
      const className = `group pointer-events-auto inline-flex items-center gap-[0.6em] whitespace-nowrap py-[0.9em] -my-[0.9em] font-semibold uppercase leading-none tracking-label ${color}`;
      const content = (
        <>
          {el.text || "Ver más"}
          <ArrowMark
            className="h-[0.8em] w-[1.3em] transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={5}
          />
        </>
      );
      return linkable ? (
        <Link href={el.href} className={className}>
          {content}
        </Link>
      ) : (
        <span className={className}>{content}</span>
      );
    }
    case "rango":
      return (
        <h1
          aria-label={`${el.from} a ${el.to}`}
          className={`font-display font-semibold leading-hero tracking-hero ${ALIGN_TEXT[el.align]} ${color}`}
        >
          <span className={`flex items-center gap-[0.2em] whitespace-nowrap ${ALIGN_ROW[el.align]}`}>
            {el.from}
            <svg
              viewBox="0 0 64 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              aria-hidden="true"
              className="h-[0.56em] w-[0.9em]"
            >
              <path d="M4 20H58M42 4L58 20L42 36" />
            </svg>
          </span>
          <span className="block whitespace-nowrap">{el.to}</span>
        </h1>
      );
  }
}

/** La sombra y los elementos de un dispositivo, encima de la foto (que dibuja el carrusel). */
export default function SlideLayers({ layout, className = "" }: { layout: DeviceLayout; className?: string }) {
  const shade = SHADE_BACKGROUND[layout.shade];
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ containerType: "size" }}
    >
      {shade && <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: shade }} />}
      {layout.elements.map((el) => (
        <div key={el.id} className="absolute w-max" style={elementPlacement(el, true)}>
          <SlideElementView el={el} />
        </div>
      ))}
    </div>
  );
}
