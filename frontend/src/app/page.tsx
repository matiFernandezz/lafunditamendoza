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
import { InstagramIcon } from "@/components/SocialIcons";
import {
  getCategoryGroups,
  getCategoryTiles,
  getFeaturedProducts,
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
      className="group inline-flex min-h-11 items-center gap-2 self-start text-xs font-semibold uppercase tracking-label text-paper"
    >
      {children}
      <ArrowMark className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={5} />
    </Link>
  );
}

/** Lo que va encima de la foto de cada slide, según su tipo (lo elige el panel). */
function slideContent(slide: HomeSlideRow): React.ReactNode {
  if (slide.kind === "rango") {
    return (
      <div
        className={`absolute inset-0 flex flex-col justify-end bg-[linear-gradient(to_top,rgb(18_18_18/0.78)_0%,rgb(18_18_18/0.35)_45%,rgb(18_18_18/0.05)_75%)] pb-12 md:pb-[clamp(2rem,8svh,72px)] ${PAGE_PADDING}`}
      >
        {/* Texto fijo del diseño (pedido por la marca), no derivado de los modelos cargados. */}
        <RangeHero
          tone="paper"
          from="iPhone 11"
          to="18 Pro Max"
          titleClassName="text-[min(3.9rem,15.2vw)] md:text-[clamp(3rem,min(10vw,17svh),10.5rem)]"
          leadClassName="max-w-[30ch] text-[0.9375rem] md:max-w-[34ch] md:text-[clamp(1rem,2.6svh,1.375rem)]"
          lead={
            <>
              Fundas y accesorios para tu iPhone.
              <span className="hidden md:inline"> Elegí tu modelo y mirá lo que hay en stock.</span>
            </>
          }
        />
      </div>
    );
  }
  if (slide.kind === "logo") {
    return (
      <div className={`absolute inset-0 flex items-end pb-[clamp(2.5rem,9svh,72px)] ${PAGE_PADDING}`}>
        {/* El PNG trae aire transparente alrededor: el margen negativo lo compensa. */}
        <Image
          src="/brand/logo-transparent.png"
          alt="La Fundita"
          width={2000}
          height={2000}
          sizes="(min-width: 768px) 30vw, 72vw"
          className="-ml-[8%] h-auto w-[min(72%,62svh)] max-w-[520px] md:-ml-[3%] md:w-[min(30%,55svh)]"
        />
      </div>
    );
  }
  if (slide.kind === "titulo" && (slide.title || slide.label)) {
    // Con etiqueta, titular más chico debajo de ella; sin etiqueta, titular grande.
    return (
      <div
        className={`absolute inset-0 flex flex-col pt-8 text-paper md:pt-[72px] ${slide.label ? "gap-4" : "gap-5"} ${TOP_SCRIM} ${PAGE_PADDING}`}
      >
        {slide.label && (
          <span className="text-xs font-semibold uppercase tracking-label text-paper/85">{slide.label}</span>
        )}
        {slide.title && (
          <h2
            className={`max-w-[10ch] font-display font-semibold leading-[0.95] tracking-page ${
              slide.label
                ? "text-[42px] md:text-[clamp(2.75rem,min(5.5vw,11svh),5.25rem)]"
                : "text-5xl md:text-[clamp(3rem,min(6.5vw,13svh),6rem)]"
            }`}
          >
            {slide.title}
          </h2>
        )}
        {slide.cta_href && <SlideCta href={slide.cta_href}>{slide.cta_label || "Ver más"}</SlideCta>}
      </div>
    );
  }
  return null;
}

export default async function Home() {
  const [categoryGroups, tiles, models, latest, homeSlides, arrivals, sections, instagramPosts] = await Promise.all([
    getCategoryGroups(),
    getCategoryTiles(),
    getIphoneModels(),
    getFeaturedProducts(10),
    getHomeSlides(),
    getHomeNewArrivals(),
    getHomeSections(),
    getInstagramPosts(),
  ]);
  const nuevos = buildNuevosIngresos(arrivals);

  const modelLines = groupModelsByLine(models);
  const fundas = categoryGroups.find((g) => g.children.length > 0);
  const fundasHref = fundas ? `/categoria/${fundas.slug}` : "/";

  const slides: HeroSlide[] = homeSlides.map((slide) => ({
    id: slide.id,
    src: slide.image_url,
    mobileSrc: slide.mobile_image_url ?? undefined,
    alt: slide.alt,
    position: slide.position ?? undefined,
    // El logo y los titulares necesitan la foto un poco más oscura para leerse.
    dim: slide.dim ?? (slide.kind === "logo" ? 0.55 : undefined),
    content: slideContent(slide),
  }));

  // Debajo de "Elegí tu iPhone", en el orden y con los títulos del panel › Tienda › Secciones.
  function renderSection(section: HomeSectionRow) {
    if (section.key === "categorias") {
      if (tiles.length === 0) return null;
      return (
        <section key={section.key} aria-label={section.title} className="space-y-5 lg:space-y-7">
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
      return <NuevosIngresosApilado key={section.key} items={nuevos} allHref={fundasHref} title={section.title} />;
    }
    if (section.key === "instagram") {
      // Los últimos posts, como en Nosotros. Sin la cuenta conectada (o sin posts), no se muestra.
      if (!instagramPosts || instagramPosts.length === 0) return null;
      return (
        <section key={section.key} aria-label={section.title} className="space-y-5 lg:space-y-7">
          <HomeSectionTitle>{section.title}</HomeSectionTitle>
          <SocialHeader icon={InstagramIcon} name="Instagram" handle={INSTAGRAM.handle} url={INSTAGRAM.url} />
          <InstagramFeed posts={instagramPosts} />
        </section>
      );
    }
    return <UltimosIngresos key={section.key} products={latest} title={section.title} allHref={fundasHref} />;
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
