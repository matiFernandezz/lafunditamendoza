import Image from "next/image";
import Link from "next/link";
import ArrowMark from "./ArrowMark";

/**
 * Mosaico de categoría del diseño: foto a sangre al 80% sobre grafito, velo
 * de tinta de abajo hacia arriba, nombre arriba e índice grande abajo. En el
 * celular es una franja a lo ancho (una debajo de la otra); desde md, 4:5.
 */
export default function CategoryTile({
  href,
  name,
  index,
  imageUrl,
  count,
}: {
  href: string;
  name: string;
  index: number;
  imageUrl: string | null;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="group relative flex h-[min(55vw,240px)] flex-col justify-between overflow-hidden bg-graphite text-paper transition-transform duration-200 active:scale-[0.98] md:aspect-[4/5] md:h-auto"
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 768px) 25vw, 100vw"
          className="object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_18_18/0.8),rgb(18_18_18/0.1)_50%,transparent)]" />
      <span className="relative p-4 text-xs font-semibold uppercase tracking-label">
        {name}
      </span>
      <span className="relative flex items-end justify-between p-4">
        <span className="font-display text-section font-semibold leading-none tracking-tight tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-label">
          Ver más
          <ArrowMark
            className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={5}
          />
        </span>
      </span>
      <span className="sr-only">{count === 1 ? "1 producto" : `${count} productos`}</span>
    </Link>
  );
}
