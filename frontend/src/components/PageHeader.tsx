import BackLink from "./BackLink";

/**
 * Encabezado de página interior: link de vuelta + h1 en Space Grotesk y, en la
 * misma línea a la derecha, el conteo chico en grafito. Cierra con una línea de tinta.
 */
export default function PageHeader({
  title,
  parent,
  count,
  countSuffix,
  back,
}: {
  title: string;
  parent?: string;
  count?: number;
  countSuffix?: string;
  back: { href: string; label: string };
}) {
  return (
    <div>
      <BackLink href={back.href}>{back.label}</BackLink>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-[3px] border-ink pb-4">
        <h1 className="font-display text-page font-semibold leading-page tracking-page text-ink">
          {parent && <span className="text-graphite">{parent} / </span>}
          {title}
        </h1>
        {count !== undefined && (
          <p className="pb-1 text-xs font-semibold uppercase tracking-label tabular-nums text-graphite md:pb-2">
            {count === 1 ? "1 producto" : `${count} productos`}
            {countSuffix && <span> {countSuffix}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
