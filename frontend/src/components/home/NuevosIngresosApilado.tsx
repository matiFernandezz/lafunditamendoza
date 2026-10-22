"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import ArrowMark from "@/components/ArrowMark";
import { formatPrice } from "@/lib/format";
import HomeSectionTitle from "./HomeSectionTitle";

export type NuevoIngreso = {
  id: string;
  name: string;
  price: number;
  href: string;
  /** PNG sin fondo, recortado al contorno de la funda (relación ≈ 0.5). */
  cutoutUrl: string;
  /** Color del marco de la funda: el canto que se ve de perfil al girar. */
  edgeColor: string;
};

// Alto del header del sitio (h-20 en AppShell): ahí se pega el título.
const HEADER_H = 80;
// Aire entre la línea del título y la primera card apilada.
const TITLE_GAP = 16;
// Antes de medir el título (primer dibujo): dónde se pegan las cards.
const STACK_TOP_FALLBACK = 190;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
// Curvas parejas (lentas al principio y al final). La del apoyo es la del
// texto y la del panel de abajo; la del giro, más suave todavía, reparte la
// media vuelta en todo el tramo para que se note.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

// Media vuelta: entra de espaldas y termina de frente. Con la vuelta entera,
// como el dorso es la misma foto, se veía frente → dorso → frente (dos giros).
const SPIN_DEGREES = 180;

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const LABEL = "text-xs font-semibold uppercase tracking-label";

/** Los elementos de un panel que se mueven con el scroll. */
type PanelRefs = {
  article: HTMLElement | null;
  veil: HTMLDivElement | null;
  path: SVGPathElement | null;
  shadow: HTMLDivElement | null;
  rotor: HTMLDivElement | null;
  front: HTMLImageElement | null;
  back: HTMLImageElement | null;
  text: HTMLDivElement | null;
};

const emptyRefs = (): PanelRefs => ({
  article: null,
  veil: null,
  path: null,
  shadow: null,
  rotor: null,
  front: null,
  back: null,
  text: null,
});

/**
 * Cómo se ve un panel según su avance (0 a 1): `land` (subida hasta apoyarse),
 * `spin` (el giro) y `cover` (cuánto lo tapa el siguiente). Lo usan el primer
 * render y cada cuadro del scroll.
 */
function frame(land: number, spin: number, cover: number, desktop: boolean) {
  const e = easeInOutCubic(land);
  const s = easeInOutSine(spin);
  const c = easeInOutCubic(cover);
  const rot = (1 - s) * SPIN_DEGREES + (desktop ? -10 : -6);
  const lift = Math.sin((1 - s) * Math.PI);
  return {
    article: `scale(${1 - c * 0.05})`,
    veil: String(c * 0.14),
    rotor: `rotateY(${rot}deg) translateY(${-lift * 16}px) scale(${1 - lift * 0.05})`,
    // Solo la cara que mira al frente: Safari a veces ignora backface-visibility.
    showBack: Math.cos((rot * Math.PI) / 180) < 0,
    shadow: `scaleX(${1 - lift * 0.5})`,
    shadowOpacity: String(1 - lift * 0.6),
    textOpacity: String(clamp((e - 0.55) / 0.45, 0, 1)),
    text: `translateY(${(1 - e) * 24}px)`,
    line: s,
  };
}

/**
 * "Nuevos ingresos" apilado: cada funda es un panel del color de la página que
 * sube y se apoya sobre el anterior (con sombra), como un mazo. El teléfono da
 * media vuelta despacio, desde que su panel asoma abajo hasta que empieza a
 * asomar el siguiente: ahí queda de frente y centrado. Una línea fina se dibuja
 * siguiendo el giro; al apoyarse el panel aparecen nombre, descripción y precio.
 *
 * Todo va atado al scroll. Para que sea fluido, React dibuja la sección una
 * sola vez: en cada cuadro solo se escriben transform/opacity directo en los
 * elementos (nada que obligue a recalcular la página), y las medidas (dónde
 * está cada panel, el largo de cada línea) se toman al cargar y al cambiar el
 * tamaño. Con prefers-reduced-motion los paneles se apilan igual, quietos.
 */
export default function NuevosIngresosApilado({
  items,
  allHref,
  title,
}: {
  items: NuevoIngreso[];
  allHref: string;
  /** Lo elige el panel › Tienda › Secciones ("Las funditas más vendidas"). */
  title: string;
}) {
  const desktop = useMedia("(min-width: 1024px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const stackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const panels = useRef<PanelRefs[]>([]);
  const n = items.length;
  const step = desktop ? 14 : 10;
  const panel = (i: number) => (panels.current[i] ??= emptyRefs());
  // Guarda un elemento del panel i (corre al montar, no durante el render).
  const keep =
    <K extends keyof PanelRefs>(i: number, key: K) =>
    (el: PanelRefs[K]) => {
      panel(i)[key] = el;
    };

  useEffect(() => {
    // Medidas: solo al cargar y cuando cambia el tamaño.
    let geometry: { vh: number; starts: number[]; lineLength: number[]; stackTop: number } | null = null;

    const measure = () => {
      const stack = stackRef.current;
      if (!stack) return null;
      // El título queda fijo debajo del header; las cards, debajo de su línea.
      const stackTop = HEADER_H + (titleRef.current?.offsetHeight ?? 0) + TITLE_GAP;
      sectionRef.current?.style.setProperty("--stack-top", `${stackTop}px`);
      // Todas las cards reservan para el texto el alto del más alto (un nombre
      // que ocupa dos líneas): así el teléfono, que usa lo que sobra, mide lo
      // mismo en todas. El texto va apoyado abajo (justify-end): lo que sobra
      // en las de nombre corto queda arriba del nombre, no debajo del link.
      const texts = panels.current.map((p) => p.text).filter((el) => el !== null);
      texts.forEach((el) => (el.style.minHeight = ""));
      const tallest = Math.max(0, ...texts.map((el) => el.offsetHeight));
      texts.forEach((el) => (el.style.minHeight = `${tallest}px`));
      const scroll = window.scrollY;
      // Posición de cada panel en la página sin el sticky: el sticky no cambia
      // el lugar que ocupa en el flujo, así que se suman altos y márgenes.
      const starts: number[] = [];
      let y = stack.getBoundingClientRect().top + scroll;
      for (let i = 0; i < n; i++) {
        const el = panel(i).article;
        if (el) {
          y += parseFloat(getComputedStyle(el).marginTop) || 0;
          starts.push(y);
          y += el.offsetHeight;
        } else {
          starts.push(y);
        }
      }
      // Largo de cada línea en píxeles de pantalla: el dibujo (viewBox 100×100)
      // se estira distinto a lo ancho y a lo alto, así que se mide punto a
      // punto, con el tamaño del panel sin achicar.
      const lineLength = starts.map((_, i) => {
        const { path, article } = panel(i);
        const svg = path?.ownerSVGElement;
        if (!path || !article || !svg) return 0;
        // El panel puede estar achicado (scale): se descuenta para medir el svg a tamaño real.
        const scale = article.getBoundingClientRect().height / article.offsetHeight || 1;
        const box = svg.getBoundingClientRect();
        const width = box.width / scale;
        const height = box.height / scale;
        const total = path.getTotalLength();
        let length = 0;
        let prev = path.getPointAtLength(0);
        for (let k = 1; k <= 64; k++) {
          const point = path.getPointAtLength((total * k) / 64);
          length += Math.hypot(
            ((point.x - prev.x) * width) / 100,
            ((point.y - prev.y) * height) / 100,
          );
          prev = point;
        }
        const rounded = Math.round(length);
        path.style.strokeDasharray = String(rounded || 1);
        return rounded;
      });
      return { vh: window.innerHeight, starts, lineLength, stackTop };
    };

    let raf = 0;
    const paint = () => {
      raf = 0;
      geometry ??= measure();
      if (!geometry) return;
      const { vh, starts, lineLength, stackTop } = geometry;
      const scroll = window.scrollY;
      // land: desde que el panel asoma abajo hasta que se pega. spin: desde que
      // asoma hasta que empieza a asomar el siguiente (el último, hasta pegarse).
      const land = starts.map((top, i) => {
        const enter = top - vh;
        const stuck = top - (stackTop + i * step);
        return clamp((scroll - enter) / ((stuck - enter) * 0.9), 0, 1);
      });
      starts.forEach((top, i) => {
        const enter = top - vh;
        const end = i < n - 1 ? starts[i + 1] - vh : top - (stackTop + i * step);
        const spin = clamp((scroll - enter) / Math.max(end - enter, 1), 0, 1);
        const f = reduced ? frame(1, 1, 0, desktop) : frame(land[i], spin, i < n - 1 ? land[i + 1] : 0, desktop);
        const p = panel(i);
        if (p.article) p.article.style.transform = f.article;
        if (p.veil) p.veil.style.opacity = f.veil;
        if (p.rotor) p.rotor.style.transform = f.rotor;
        if (p.front) p.front.style.opacity = f.showBack ? "0" : "1";
        if (p.back) p.back.style.opacity = f.showBack ? "1" : "0";
        if (p.shadow) {
          p.shadow.style.transform = f.shadow;
          p.shadow.style.opacity = f.shadowOpacity;
        }
        if (p.text) {
          p.text.style.opacity = f.textOpacity;
          p.text.style.transform = f.text;
        }
        if (p.path) p.path.style.strokeDashoffset = String((1 - f.line) * (lineLength[i] || 1));
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onResize = () => {
      geometry = null;
      onScroll();
    };

    paint();
    // Lo de arriba de la sección (fotos, fuentes) puede terminar de cargar
    // después y correrla: se vuelve a medir cuando cambia el alto de la página.
    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [n, step, desktop, reduced]);

  // Más bajas que la pantalla: en la computadora dejan aire arriba y abajo
  // (tope de 440px) y en el celular llegan hasta 500px.
  const panelHeight = desktop
    ? `min(calc(100vh - var(--stack-top, ${STACK_TOP_FALLBACK}px) - ${(n - 1) * step}px - 32px), 440px)`
    : `min(calc(100svh - var(--stack-top, ${STACK_TOP_FALLBACK}px) - ${(n - 1) * step}px - 12px), 500px)`;
  // El texto (nombre, precio, "Ver funda") nunca se achica: en el celular el
  // teléfono ocupa todo el alto que sobra arriba de él (con tope de 340px), así
  // en pantallas bajas o angostas se achica la foto y no se corta el link. En la
  // compu va al costado y usa casi todo el alto.
  const phoneHeight = desktop ? `min(52vh, 380px, calc(${panelHeight} - 48px))` : "min(100%, 340px)";
  const path = desktop
    ? "M 70 0 C 70 10 44 6 44 28 C 44 54 99 40 97 64 C 95 84 80 90 70 90"
    : "M 50 0 C 50 13 10 9 10 36 C 10 65 92 43 90 74 C 88 94 64 99 50 97";
  // Primer dibujo (antes de medir): de espaldas y sin texto; con reduced-motion, quieto y de frente.
  const start = reduced ? frame(1, 1, 0, desktop) : frame(0, 0, 0, desktop);

  return (
    <section ref={sectionRef} aria-label={title} className="relative flex w-full flex-col" style={{ gap: TITLE_GAP }}>
      {/* El título con su línea queda fijo debajo del header (con aire arriba,
          para no pegarse a la barra) mientras las cards se apilan debajo. */}
      <div ref={titleRef} className="sticky top-20 z-10 bg-paper pt-6 lg:pt-8">
        {/* "Ver todas" va junto al título (solo en la compu): un link extra en la
            última card la hacía distinta (el teléfono quedaba más chico). */}
        <HomeSectionTitle action={desktop ? { href: allHref, label: "Ver todas" } : undefined}>{title}</HomeSectionTitle>
      </div>

      {/* Al final de la pila queda un tramo de scroll con las cards ya apiladas y
          quietas: así la última no sube sola tapando los escalones (y sus líneas)
          de las de atrás, y después se va toda la pila junta. */}
      <div ref={stackRef} className="relative w-full">
        {items.map((item, i) => {
          const face = (isBack: boolean) => (
            <Image
              ref={keep(i, isBack ? "back" : "front")}
              src={item.cutoutUrl}
              alt=""
              fill
              draggable={false}
              sizes="(min-width: 1024px) 190px, 140px"
              quality={90}
              className="object-contain"
              style={{
                opacity: isBack === start.showBack ? 1 : 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: `${isBack ? "rotateY(180deg) " : ""}translateZ(4px)`,
                filter: isBack ? "brightness(.9)" : "none",
              }}
            />
          );
          const edge = (side: "left" | "right") => (
            <div
              aria-hidden="true"
              className="absolute bottom-[7%] top-[7%] w-2 rounded"
              style={{ [side]: -4, background: item.edgeColor, filter: "brightness(.85)", transform: "rotateY(90deg)" }}
            />
          );

          const phone = (
            <div className="relative z-[1] aspect-[0.5]" style={{ height: phoneHeight, perspective: desktop ? 1600 : 1100 }}>
              {/* Sombra de apoyo: se achica y se aclara mientras el teléfono está levantado. */}
              <div
                ref={keep(i, "shadow")}
                aria-hidden="true"
                className="absolute bottom-[-5%] left-[6%] right-[6%] h-[5%] rounded-[50%] bg-ink/28 blur-[10px]"
                style={{ transform: start.shadow, opacity: start.shadowOpacity }}
              />
              <div
                ref={keep(i, "rotor")}
                role="img"
                aria-label={item.name}
                className="absolute inset-0 will-change-transform"
                style={{ transformStyle: "preserve-3d", transform: start.rotor }}
              >
                {face(false)}
                {face(true)}
                {edge("left")}
                {edge("right")}
              </div>
            </div>
          );

          // Línea que sigue el giro: se completa justo cuando el teléfono queda de
          // frente. En la compu cruza el panel; en el celular va solo en la zona de
          // la foto (desde el borde de arriba), así nunca pasa por encima del nombre.
          const line = (
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className={`pointer-events-none absolute overflow-visible ${desktop ? "inset-0 size-full" : "-left-5 -top-6 h-[calc(100%+1.5rem)] w-[calc(100%+2.5rem)]"}`}
            >
              <path
                ref={keep(i, "path")}
                d={path}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                // Hasta medirla (primer cuadro), la línea no se ve.
                style={{ strokeDasharray: 1, strokeDashoffset: reduced ? 0 : 1 }}
              />
            </svg>
          );

          const text = (
            <div
              ref={keep(i, "text")}
              className="relative z-[1] flex flex-col justify-end gap-1.5 lg:gap-4"
              style={{ opacity: start.textOpacity, transform: start.text }}
            >
              <h3 className="font-display text-[2rem] font-semibold leading-[0.95] tracking-page text-ink sm:text-[2.5rem] lg:text-[clamp(2.5rem,4.4vw,4.5rem)]">
                {item.name}
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-6 lg:mt-2">
                <span className="font-mono text-lg text-ink lg:text-[22px]">{formatPrice(item.price)}</span>
                <Link href={item.href} className={`${LABEL} group inline-flex min-h-11 items-center gap-2 text-ink`}>
                  Ver funda
                  <ArrowMark className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={5} />
                </Link>
              </div>
            </div>
          );

          return (
            <article
              key={item.id}
              ref={keep(i, "article")}
              aria-label={item.name}
              className="sticky overflow-hidden border-t border-rule bg-paper"
              style={{
                top: `calc(var(--stack-top, ${STACK_TOP_FALLBACK}px) + ${i * step}px)`,
                // Las de atrás se estiran lo que bajan las de adelante (queda tapado): así
                // todas terminan a la misma altura y la pila se suelta junta, sin que
                // la última suba sola y tape los escalones.
                height: `calc(${panelHeight} + ${(n - 1 - i) * step}px)`,
                // Más recorrido entre panel y panel: el giro se estira y se nota.
                marginTop: i ? (desktop ? "45vh" : "40svh") : 0,
                boxShadow: i ? "0 -18px 40px -12px rgb(18 18 18 / .16)" : "none",
                transform: start.article,
                transformOrigin: "50% 0",
              }}
            >
              {/* Velo que oscurece el panel cuando el siguiente lo tapa. */}
              <div
                ref={keep(i, "veil")}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[2] bg-ink"
                style={{ opacity: start.veil }}
              />
              {desktop && line}

              {/* Mobile: teléfono arriba y texto abajo. Desktop: texto a la izquierda y teléfono a la derecha. */}
              <div
                className="flex flex-col gap-7 px-5 pb-2 pt-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-12 lg:py-0"
                style={{ height: panelHeight }}
              >
                <div className="relative flex min-h-0 flex-1 items-center justify-center lg:order-2 lg:translate-x-[8%]">
                  {!desktop && line}
                  {phone}
                </div>
                <div className="shrink-0 lg:order-1">{text}</div>
              </div>
            </article>
          );
        })}
        {/* Espacio vacío (no padding: el sticky no cuenta el padding del contenedor). */}
        <div aria-hidden="true" style={{ height: `calc(${(n - 1) * step}px + ${desktop ? "28vh" : "22svh"})` }} />
      </div>
    </section>
  );
}
