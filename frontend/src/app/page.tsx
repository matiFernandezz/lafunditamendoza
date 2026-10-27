import Image from "next/image";
import Link from "next/link";
import InstagramFeed from "@/components/about/InstagramFeed";
import SocialHeader from "@/components/about/SocialHeader";
import AnnouncementBar from "@/components/AnnouncementBar";
import ArrowMark from "@/components/ArrowMark";
import CategoryTile from "@/components/CategoryTile";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import HomeSectionTitle from "@/components/home/HomeSectionTitle";
import NuevosIngresosApilado from "@/components/home/NuevosIngresosApilado";
import { buildNuevosIngresos } from "@/components/home/nuevosIngresos";
import UltimosIngresos from "@/components/home/UltimosIngresos";
import ModelStrip from "@/components/ModelStrip";
import RangeHero from "@/components/RangeHero";
import SlideLayers from "@/components/SlideLayers";
import { brightnessOf, type SlideLayout } from "@/lib/slideLayout";
import { InstagramIcon } from "@/components/SocialIcons";
import {
  ALL_PRODUCTS_SLUG,
  getCategoryTiles,
  getHomeLatestProducts,
  getHomeNewArrivals,
  getHomeSections,
  getHomeSlides,
  getIphoneModels,
  groupModelsByLine,
  type HomeSectionRow,
  type HomeSlideRow,
} from "@/lib/catalog";
import { FULL_BLEED, PAGE_PADDING } from "@/lib/layout";
import { getInstagramPosts } from "@/lib/server/instagram";
import { INSTAGRAM } from "@/lib/storeConfig";

// Las categorías, productos y fotos de la home vienen de la base (se editan en
// el panel › Tienda): sin esto Next pre-renderiza la home en el build y queda congelada.
export const dynamic = "force-dynamic";

// Avisos de la barra que se desplaza arriba de la portada.
const ANNOUNCEMENTS = [
  "Envíos flash durante el día",
  "Envíos gratis a partir de $50.000",
  "Retirá tu fundita en punto de encuentro",
  "Fundas del iPhone 11 al 18 Pro Max",
];

// Velo de tinta arriba, para los titulares.
const TOP_SCRIM = "bg-[linear-gradient(to_bottom,rgb(18_18_18/0.6),transparent_50%)]";

function SlideCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group pointer-events-auto inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-label text-paper"
    >
      {children}
      <ArrowMark className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={5} />
    </Link>
  );
}

const BOTTOM_SCRIM = "bg-[linear-gradient(to_top,rgb(18_18_18/0.78)_0%,rgb(18_18_18/0.35)_45%,rgb(18_18_18/0.05)_75%)]";
const MIDDLE_SCRIM = "bg-[radial-gradient(ellipse_at_center,rgb(18_18_18/0.45),transparent_70%)]";

// Tamaño del titular elegido en el panel: iguales para el rango y los titulares.
const TEXT_SIZE_CLASS = {
  chico: "text-[40px] md:text-[clamp(2.5rem,min(5vw,10svh),4.5rem)]",
  mediano: "text-5xl md:text-[clamp(3rem,min(6.5vw,13svh),6rem)]",
  grande: "text-[min(3.9rem,15.2vw)] md:text-[clamp(3rem,min(10vw,17svh),10.5rem)]",
} as const;

type TextPosition = NonNullable<HomeSlideRow["text_position"]>;

/**
 * Clases del contenedor para ubicar el texto (o el logo) donde dice el panel,
 * con la sombra del lado del texto para que se lea. Abajo a la derecha deja
 * lugar para los puntitos del carrusel. El contenedor deja pasar los clics
 * (texto y logo pueden ir en dos capas encima de la foto); el link los toma.
 */
function placeText(position: TextPosition, scrim = true) {
  const [v, h] = position.split("-") as ["arriba" | "centro" | "abajo", "izquierda" | "centro" | "derecha"];
  const vertical = {
    arriba: `justify-start pt-8 md:pt-[72px] ${scrim ? TOP_SCRIM : ""}`,
    centro: `justify-center py-12 ${scrim ? MIDDLE_SCRIM : ""}`,
    abajo: `justify-end ${h === "derecha" ? "pb-16 md:pb-[clamp(4rem,10svh,96px)]" : "pb-12 md:pb-[clamp(2rem,8svh,72px)]"} ${scrim ? BOTTOM_SCRIM : ""}`,
  }[v];
  const horizontal = {
    izquierda: "items-start text-left",
    centro: "items-center text-center",
    derecha: "items-end text-right",
  }[h];
  const align = ({ izquierda: "left", centro: "center", derecha: "right" } as const)[h];
  return {
    className: `pointer-events-none absolute inset-0 flex flex-col ${vertical} ${horizontal} ${PAGE_PADDING}`,
    align,
    h,
  };
}

const RANGE_LEAD = (
  <>
    Fundas y accesorios para tu iPhone.
    <span className="hidden md:inline"> Elegí tu modelo y mirá lo que hay en stock.</span>
  </>
);

// Ancho del logo elegido en el panel. Mediano es el de siempre.
const LOGO_SIZE_CLASS = {
  chico: "w-[min(22%,19svh)] md:w-[min(9%,16svh)]",
  mediano: "w-[min(30%,26svh)] md:w-[min(12.5%,23svh)]",
  grande: "w-[min(42%,36svh)] md:w-[min(18%,33svh)]",
} as const;

/**
 * El logo blanco de la marca encima de la foto. Es el PNG recortado (sin el
 * aire transparente del original), así llega justo a la esquina que se eligió.
 */
function SlideLogo({ size }: { size: HomeSlideRow["logo_size"] }) {
  return (
    <Image
      src="/brand/logo-trimmed.png"
      alt="La Fundita"
      width={836}
      height={949}
      sizes="(min-width: 768px) 18vw, 42vw"
      className={`h-auto ${LOGO_SIZE_CLASS[size ?? "mediano"]}`}
    />
  );
}

/**
 * Lo que va encima de la foto de cada slide (lo elige el panel): el texto
 * según el tipo, el link y, si se eligió, el logo. Texto y logo en el mismo
 * lugar van uno debajo del otro; en lugares distintos, cada uno en el suyo.
 */
function slideContent(slide: HomeSlideRow): React.ReactNode {
  // El link va en cualquier tipo de foto, con el texto que se eligió en el panel.
  const cta = slide.cta_href && <SlideCta href={slide.cta_href}>{slide.cta_label || "Ver más"}</SlideCta>;
  // El tipo "logo" lo lleva siempre (abajo a la izquierda si no se eligió); el resto, solo si se eligió.
  const logoAt = slide.logo_position ?? (slide.kind === "logo" ? "abajo-izquierda" : null);
  const hasText = slide.kind === "rango" || Boolean(slide.title || slide.label || cta);
  // Automático: el rango abajo, el texto del tipo "logo" debajo del logo, y los titulares arriba.
  const textAt =
    slide.text_position ??
    (slide.kind === "rango" ? "abajo-izquierda" : slide.kind === "logo" && logoAt ? logoAt : "arriba-izquierda");

  function text(align: "left" | "center" | "right") {
    if (slide.kind === "rango") {
      return (
        <>
          {/* Textos del panel; vacíos, los de siempre del diseño. */}
          <RangeHero
            tone="paper"
            align={align}
            from={slide.label ?? "iPhone 11"}
            to={slide.title ?? "18 Pro Max"}
            titleClassName={TEXT_SIZE_CLASS[slide.text_size ?? "grande"]}
            leadClassName="max-w-[30ch] text-[0.9375rem] md:max-w-[34ch] md:text-[clamp(1rem,2.6svh,1.375rem)]"
            lead={slide.subtitle ?? RANGE_LEAD}
          />
          {cta}
        </>
      );
    }
    // Automático: junto al logo, chico; con etiqueta, más chico debajo de ella; sin etiqueta, más grande.
    const size = slide.text_size ?? (slide.kind === "logo" ? "chico" : slide.label ? null : "mediano");
    return (
      <>
        <SlideHeadline slide={slide} size={size} />
        {cta}
      </>
    );
  }
  const gap = slide.kind === "rango" ? "gap-6" : slide.label ? "gap-4" : "gap-5";

  if (!hasText && !logoAt) return null;
  if (!logoAt || !hasText || logoAt === textAt) {
    const place = placeText(hasText ? textAt : logoAt!);
    return (
      <div className={`${place.className} ${gap} text-paper`}>
        {logoAt && <SlideLogo size={slide.logo_size} />}
        {hasText && text(place.align)}
      </div>
    );
  }
  // Cada uno en su lugar: la sombra va del lado del texto.
  const logoPlace = placeText(logoAt, false);
  const textPlace = placeText(textAt);
  return (
    <>
      <div className={`${textPlace.className} ${gap} text-paper`}>{text(textPlace.align)}</div>
      <div className={logoPlace.className}>
        <SlideLogo size={slide.logo_size} />
      </div>
    </>
  );
}

/**
 * Slide armado en el editor del panel: cada dispositivo con su encuadre, su
 * oscurecido y sus elementos (el del celular hasta md, el de la compu desde md).
 */
function designedSlide(slide: HomeSlideRow, layout: SlideLayout): HeroSlide {
  return {
    id: slide.id,
    src: slide.image_url,
    mobileSrc: slide.mobile_image_url ?? undefined,
    alt: slide.alt,
    position: `${layout.desktop.focusX}% ${layout.desktop.focusY}%`,
    mobilePosition: `${layout.mobile.focusX}% ${layout.mobile.focusY}%`,
    dim: brightnessOf(layout.desktop),
    mobileDim: brightnessOf(layout.mobile),
    content: (
      <>
        <SlideLayers layout={layout.mobile} className="md:hidden" />
        <SlideLayers layout={layout.desktop} className="hidden md:block" />
      </>
    ),
  };
}

/** Etiqueta chica y titular de un slide (lo que haya cargado). */
function SlideHeadline({ slide, size }: { slide: HomeSlideRow; size: HomeSlideRow["text_size"] }) {
  return (
    <>
      {slide.label && (
        <span className="text-xs font-semibold uppercase tracking-label text-paper/85">{slide.label}</span>
      )}
      {slide.title && (
        <h2
          className={`max-w-[10ch] font-display font-semibold leading-[0.95] tracking-page ${
            size ? TEXT_SIZE_CLASS[size] : "text-[42px] md:text-[clamp(2.75rem,min(5.5vw,11svh),5.25rem)]"
          }`}
        >
          {slide.title}
        </h2>
      )}
    </>
  );
}

export default async function Home() {
  const [tiles, models, latest, homeSlides, arrivals, sections, instagramPosts] = await Promise.all([
    getCategoryTiles(),
    getIphoneModels(),
    getHomeLatestProducts(),
    getHomeSlides(),
    getHomeNewArrivals(),
    getHomeSections(),
    getInstagramPosts(),
  ]);
  const nuevos = buildNuevosIngresos(arrivals);

  const modelLines = groupModelsByLine(models);
  // "Ver todo" de los ingresos: la página con todos los productos.
  const ALL_PRODUCTS_HREF = `/categoria/${ALL_PRODUCTS_SLUG}`;

  const slides: HeroSlide[] = homeSlides.map((slide) =>
    slide.layout
      ? designedSlide(slide, slide.layout)
      : {
          id: slide.id,
          src: slide.image_url,
          mobileSrc: slide.mobile_image_url ?? undefined,
          alt: slide.alt,
          position: slide.position ?? undefined,
          mobilePosition: slide.position_mobile ?? undefined,
          // El logo y los titulares necesitan la foto un poco más oscura para leerse.
          dim: slide.dim ?? (slide.kind === "logo" ? 0.55 : undefined),
          content: slideContent(slide),
        },
  );

  // Debajo de "Elegí tu iPhone", en el orden y con los títulos del panel › Tienda › Secciones.
  function renderSection(section: HomeSectionRow) {
    if (section.key === "categorias") {
      if (tiles.length === 0) return null;
      return (
        <section key={section.key} aria-label={section.title} className="space-y-4 lg:space-y-6">
          <HomeSectionTitle>{section.title}</HomeSectionTitle>
          {/* Siempre con el margen de la página (no a sangre). Los tipos de funda
              y Accesorios: uno debajo del otro en mobile y los 4 en una fila desde md.
              Sin foto (panel › Tienda), el mosaico va en grafito liso. */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:gap-4">
            {tiles.map((tile, index) => (
              <CategoryTile
                key={tile.id}
                href={tile.href}
                name={tile.name}
                index={index + 1}
                count={tile.count}
                imageUrl={tile.imageUrl}
              />
            ))}
          </div>
        </section>
      );
    }
    if (section.key === "mas_vendidas") {
      // Las fundas que giran, elegidas en el panel. Sin ninguna disponible, no se muestra.
      if (nuevos.length === 0) return null;
      return (
        <NuevosIngresosApilado key={section.key} items={nuevos} allHref={ALL_PRODUCTS_HREF} title={section.title} />
      );
    }
    if (section.key === "instagram") {
      // Los últimos posts, como en Nosotros. Sin la cuenta conectada (o sin posts), no se muestra.
      if (!instagramPosts || instagramPosts.length === 0) return null;
      return (
        <section key={section.key} aria-label={section.title} className="space-y-4 lg:space-y-6">
          <HomeSectionTitle>{section.title}</HomeSectionTitle>
          <SocialHeader icon={InstagramIcon} name="Instagram" handle={INSTAGRAM.handle} url={INSTAGRAM.url} />
          <InstagramFeed posts={instagramPosts} />
        </section>
      );
    }
    return <UltimosIngresos key={section.key} products={latest} title={section.title} allHref={ALL_PRODUCTS_HREF} />;
  }

  return (
    <div className="space-y-16 md:space-y-24">
      {/* A sangre y pegado al header: cancela el padding lateral y el de arriba del <main>.
          Alto: vertical en el celular (4:5), más bajo en tablet y apaisado en la
          compu, pero nunca más alto que la pantalla (sin la barra de arriba). En la
          compu (lg) llena justo lo que queda de pantalla debajo del header (80px)
          y la barra de avisos (28px + 1px de borde). */}
      <div className={`-mt-8 md:-mt-14 ${FULL_BLEED}`}>
        <AnnouncementBar items={ANNOUNCEMENTS} />
        {slides.length > 0 && (
          <section
            aria-label="Destacado"
            className="relative h-[min(125vw,calc(100svh-80px))] overflow-hidden bg-ink sm:h-[min(78vw,calc(100svh-80px))] md:h-[min(45.6vw,calc(100svh-80px))] lg:h-[calc(100svh-109px)]"
          >
            <HeroCarousel slides={slides} />
          </section>
        )}
      </div>

      {modelLines.length > 0 && (
        <div className={FULL_BLEED}>
          <ModelStrip lines={modelLines} />
        </div>
      )}

      {/* El contenido de la home (debajo de la portada y los modelos) tiene un
          ancho máximo y va centrado: a todo el ancho de una notebook las fotos y
          las cards quedaban enormes. */}
      <div className="mx-auto w-full max-w-[1160px] space-y-16 md:space-y-24">
        {sections.filter((section) => section.visible).map((section) => renderSection(section))}
      </div>
    </div>
  );
}
