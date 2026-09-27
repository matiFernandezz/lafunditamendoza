import Image from "next/image";
import Link from "next/link";
import ArrowMark from "@/components/ArrowMark";
import HeroCarousel from "@/components/HeroCarousel";
import IphoneModelStrip from "@/components/IphoneModelStrip";
import ProductTile from "@/components/ProductTile";
import {
  coverImage,
  getCategoryGroups,
  getCategoryTiles,
  getFeaturedProducts,
  getIphoneModels,
  groupModelsByLine,
} from "@/lib/catalog";

// Las categorías y productos vienen de la base: sin esto Next pre-renderiza
// la home en el build y queda congelada.
export const dynamic = "force-dynamic";

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
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[20px] bg-graphite"
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

  // Mismos destacados de la sección de abajo, mostrando su portada: ninguna
  // foto nueva, solo se reusan las que ya elegimos con el criterio de "destacado".
  const heroImages = featured
    .map((product) => ({ id: product.id, url: coverImage(product), alt: product.name }))
    .filter((img): img is { id: string; url: string; alt: string } => img.url !== null)
    .slice(0, 6);

  return (
    <div className="space-y-16 md:space-y-24">
      <section className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center md:gap-12">
        <div className="space-y-6">
          <h1 className="font-display text-[clamp(2.75rem,11vw,6.5rem)] font-black leading-[0.92] tracking-[-0.03em] text-pretty">
            Tu iPhone,
            <br />
            pero más vos.
          </h1>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[34ch] text-base text-graphite md:text-xl">
              Fundas y accesorios para tu iPhone, elegidos y armados a mano.
            </p>
            {fundas && (
              <Link
                href={`/categoria/${fundas.slug}`}
                className="inline-flex h-14 shrink-0 items-center gap-2 border-b-2 border-ink text-base font-semibold"
              >
                Ver todo
                <ArrowMark className="h-2.5 w-4" strokeWidth={5} />
              </Link>
            )}
          </div>
        </div>
        {heroImages.length > 0 && <HeroCarousel images={heroImages} />}
      </section>

      {modelLines.length > 0 && <IphoneModelStrip lines={modelLines} />}

      {tiles.length > 0 && (
        <section aria-label="Categorías" className="space-y-5">
          <h2 className="font-display text-2xl font-black tracking-tight">
            Elegí por categoría
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
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
