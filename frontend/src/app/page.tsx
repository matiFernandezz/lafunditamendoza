import Image from "next/image";
import Link from "next/link";
import ArrowMark from "@/components/ArrowMark";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import IphoneModelStrip from "@/components/IphoneModelStrip";
import ProductTile from "@/components/ProductTile";
import {
  getCategoryGroups,
  getCategoryTiles,
  getFeaturedProducts,
  getIphoneModels,
  groupModelsByLine,
} from "@/lib/catalog";
import { FULL_BLEED } from "@/lib/layout";

// Las categorías y productos vienen de la base: sin esto Next pre-renderiza
// la home en el build y queda congelada.
export const dynamic = "force-dynamic";

// Fotos de marca para el fondo del hero (no product_images: son renders
// encargados para la home, no fotos de un producto puntual). Para sumar
// más, agregar el archivo a public/hero/ y una entrada acá.
const HERO_SLIDES: HeroSlide[] = [
  {
    id: "render-central",
    src: "/hero/render-central.jpg",
    alt: "Mano sosteniendo un iPhone con Cherry Case y, al lado, otro con Chessy Case",
  },
];

function CategoryTileCard({
  href,
  name,
  count,
  imageUrl,
  index,
}: {
  href: string;
  name: string;
  count: number;
  imageUrl: string | null;
  index: number;
}) {
  return (
    <Link
      href={href}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden bg-graphite"
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 768px) 20vw, 45vw"
          className="object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
      <div className="relative flex items-start justify-between p-4 text-paper">
        <span className="text-xs font-semibold tracking-wide">
          {name.toUpperCase()}
        </span>
      </div>
      <div className="relative flex items-end justify-between p-4 text-paper">
        <span className="font-display text-3xl font-black tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide">
          VER MÁS
          <ArrowMark className="h-2.5 w-4" strokeWidth={5} />
        </span>
      </div>
      <span className="sr-only">
        {count === 1 ? "1 producto" : `${count} productos`}
      </span>
    </Link>
  );
}

export default async function Home() {
  const [categoryGroups, tiles, models, featured] = await Promise.all([
    getCategoryGroups(),
    getCategoryTiles(),
    getIphoneModels(),
    getFeaturedProducts(8),
  ]);

  const modelLines = groupModelsByLine(models);
  const fundas = categoryGroups.find((g) => g.children.length > 0);

  return (
    <div className="space-y-16 md:space-y-24">
      {/*
        Los renders de public/hero/ ya son piezas terminadas (headline, CTA y
        paginación de referencia incluidos en la foto): no se les superpone
        texto propio encima, porque duplicaría lo que ya está en la imagen.
        Todo el bloque es un link a Fundas; el h1 queda oculto solo para
        accesibilidad/SEO.
      */}
      <section className={`relative overflow-hidden bg-ink ${FULL_BLEED}`}>
        <h1 className="sr-only">Tu iPhone, pero más vos.</h1>
        {fundas && (
          <Link
            href={`/categoria/${fundas.slug}`}
            aria-label="Ver todos los productos"
            className="absolute inset-0 z-0"
          />
        )}
        <div className="relative aspect-[4/3] w-full pointer-events-none sm:aspect-[16/9] lg:aspect-[1584/722]">
          <HeroCarousel slides={HERO_SLIDES} />
        </div>
      </section>

      {modelLines.length > 0 && (
        <div className={FULL_BLEED}>
          <IphoneModelStrip lines={modelLines} />
        </div>
      )}

      {tiles.length > 0 && (
        <section aria-label="Categorías" className="space-y-5">
          <h2 className="font-display text-2xl font-black tracking-tight">
            Elegí por categoría
          </h2>
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4 ${FULL_BLEED}`}>
            {tiles.map((tile, index) => (
              <CategoryTileCard
                key={tile.id}
                href={`/categoria/${tile.slug}`}
                name={tile.name}
                count={tile.count}
                imageUrl={tile.imageUrl}
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section aria-label="Destacados" className="space-y-5">
          <div>
            <p className="text-xs font-semibold tracking-wide text-graphite">
              COLECCIÓN DESTACADA
            </p>
            <h2 className="mt-1 font-display text-3xl font-black tracking-tight text-pretty md:text-4xl">
              Recién llegados.
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
            {featured.map((product) => (
              <ProductTile key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
