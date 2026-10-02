import BackLink from "./BackLink";

/** Encabezado de página interior: link de vuelta + h1 en Space Grotesk + conteo en grafito. */
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
      <h1 className="mt-3 font-display text-page font-semibold leading-page tracking-page text-ink">
        {parent && <span className="text-graphite">{parent} / </span>}
        {title}
      </h1>
      {count !== undefined && (
        <p className="mt-3 tabular-nums text-graphite">
          {count === 1 ? "1 producto" : `${count} productos`}
          {countSuffix && <span> {countSuffix}</span>}
        </p>
      )}
    </div>
  );
}
