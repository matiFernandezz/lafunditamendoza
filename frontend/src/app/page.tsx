import Image from "next/image";
import Link from "next/link";
import ArrowMark from "@/components/ArrowMark";
import CategoryTile from "@/components/CategoryTile";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import ModelStrip from "@/components/ModelStrip";
import ProductTile from "@/components/ProductTile";
import RangeHero from "@/components/RangeHero";
import SectionHeading from "@/components/SectionHeading";
import {
  getCategoryGroups,
  getCategoryTiles,
  getFeaturedProducts,
  getIphoneModels,
  groupModelsByLine,
} from "@/lib/catalog";
import { FULL_BLEED, PAGE_PADDING } from "@/lib/layout";

// Las categorías y productos vienen de la base: sin esto Next pre-renderiza
// la home en el build y queda congelada.
export const dynamic = "force-dynamic";

// Fotos de marca (design/assets/photos) para los tipos de funda.
// Los mosaicos sin foto de marca van en grafito liso, como en el diseño:
// las fotos de producto de la base son chicas y quedan pixeladas a ese tamaño.
const CATEGORY_PHOTOS: Record<string, string> = {
  diseno: "/photos/star-cases.jpg",
  transparentes: "/photos/cherry-cases.jpg",
  silicona: "/photos/magsafe-colores-mesa.jpg",
};

// Velo de tinta arriba, para los titulares de los slides 2 y 3.
const TOP_SCRIM = "bg-[linear-gradient(to_bottom,rgb(18_18_18/0.6),transparent_50%)]";

function SlideCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-2 self-start text-xs font-semibold uppercase tracking-label text-paper"
    >
      {children}
      <ArrowMark
        className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
        strokeWidth={5}
      />
    </Link>
  );
}

export default async function Home() {
  const [categoryGroups, tiles, models, featured] = await Promise.all([
    getCategoryGroups(),
    getCategoryTiles(),
    getIphoneModels(),
    getFeaturedProducts(4),
  ]);

  const modelLines = groupModelsByLine(models);
  const fundas = categoryGroups.find((g) => g.children.length > 0);
  const fundasHref = fundas ? `/categoria/${fundas.slug}` : "/";
  const designHref = tiles.find((t) => t.slug === "diseno")?.href ?? fundasHref;

  const slides: HeroSlide[] = [
    {
      id: "rango",
      src: "/photos/marble-cases.jpg",
      alt: "Fundas tornasoladas sobre una mesa de madera",
      content: (
        <div
          className={`absolute inset-0 flex flex-col justify-end bg-[linear-gradient(to_top,rgb(18_18_18/0.78)_0%,rgb(18_18_18/0.35)_45%,rgb(18_18_18/0.05)_75%)] pb-12 md:pb-[72px] ${PAGE_PADDING}`}
        >
          {/* Texto fijo del diseño (pedido por la marca), no derivado de los modelos cargados. */}
          <RangeHero
            tone="paper"
            from="iPhone 11"
            to="18 Pro Max"
            titleClassName="text-[min(3.9rem,15.2vw)] md:text-[clamp(5rem,10vw,10.5rem)]"
            leadClassName="max-w-[30ch] text-[0.9375rem] md:max-w-[34ch] md:text-[1.375rem]"
            lead={
              <>
                Fundas y accesorios para tu iPhone.
                <span className="hidden md:inline"> Elegí tu modelo y mirá lo que hay en stock.</span>
              </>
            }
          />
        </div>
      ),
    },
    {
      id: "diseno",
      src: "/photos/magsafe-colores-mesa.jpg",
      alt: "Fundas de colores sobre una mesa",
      content: (
        <div className={`absolute inset-0 flex flex-col gap-4 pt-8 text-paper md:pt-[72px] ${TOP_SCRIM} ${PAGE_PADDING}`}>
          <span className="text-xs font-semibold uppercase tracking-label text-paper/85">
            Fundas de diseño
          </span>
          <h2 className="max-w-[10ch] font-display text-[42px] font-semibold leading-[0.95] tracking-page md:text-[84px]">
            Fundas con diseño para vos.
          </h2>
          <SlideCta href={designHref}>Ver más</SlideCta>
        </div>
      ),
    },
    {
      id: "mas-vos",
      src: "/photos/coleccion-flatlay-a.jpg",
      alt: "Colección de fundas sobre una mesa",
      content: (
        <div className={`absolute inset-0 flex flex-col gap-5 pt-8 text-paper md:pt-[72px] ${TOP_SCRIM} ${PAGE_PADDING}`}>
          <h2 className="max-w-[10ch] font-display text-5xl font-semibold leading-[0.95] tracking-page md:text-8xl">
            Tu iPhone, pero más vos.
          </h2>
          <SlideCta href={fundasHref}>Ver todo</SlideCta>
        </div>
      ),
    },
    {
      id: "logo",
      src: "/photos/wave-cases-mesa.jpg",
      alt: "Fundas con olas sobre una mesa de madera",
      position: "center 40%",
      dim: 0.55,
      content: (
        <div className={`absolute inset-0 flex items-end pb-[72px] ${PAGE_PADDING}`}>
          {/* El PNG trae aire transparente alrededor: el margen negativo lo compensa. */}
          <Image
            src="/brand/logo-transparent.png"
            alt="La Fundita"
            width={2000}
            height={2000}
            sizes="(min-width: 768px) 30vw, 72vw"
            className="-ml-[8%] h-auto w-[72%] max-w-[520px] md:-ml-[3%] md:w-[30%]"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-16 md:space-y-24">
      {/* A sangre y pegado al header: cancela el padding lateral y el de arriba del <main>. */}
      <section
        aria-label="Destacado"
        className={`relative -mt-8 aspect-[4/5] overflow-hidden bg-ink md:-mt-14 md:aspect-[1584/722] ${FULL_BLEED}`}
      >
        <HeroCarousel slides={slides} />
      </section>

      {modelLines.length > 0 && (
        <div className={FULL_BLEED}>
          <ModelStrip lines={modelLines} />
        </div>
      )}

      {tiles.length > 0 && (
        <section aria-label="Categorías" className="space-y-5">
          <SectionHeading size="headline" title="Elegí por categoría" />
          {/* Siempre con el margen de la página (no a sangre). Los tipos de funda
              y Accesorios: 2 por fila en mobile y los 4 en una fila desde md. */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
            {tiles.map((tile, index) => (
              <CategoryTile
                key={tile.id}
                href={tile.href}
                name={tile.name}
                index={index + 1}
                count={tile.count}
                imageUrl={CATEGORY_PHOTOS[tile.slug] ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section aria-label="Destacados" className="space-y-5">
          <SectionHeading label="Colección destacada" title="Recién llegados." />
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-4 md:gap-y-12">
            {featured.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
