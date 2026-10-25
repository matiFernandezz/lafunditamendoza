import ArrowMark from "../ArrowMark";

/**
 * Encabezado de una red en los carruseles de redes (Nosotros y la home): el
 * ícono en un círculo de tinta, el nombre y el usuario, y "Ver perfil →".
 */
export default function SocialHeader({
  icon: Icon,
  name,
  handle,
  url,
}: {
  icon: () => React.ReactNode;
  name: string;
  handle: string;
  url: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule pb-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-ink text-paper">
          <Icon />
        </span>
        <div className="flex flex-col">
          <span className="font-display text-title font-semibold tracking-tight text-ink">{name}</span>
          <span className="font-mono text-sm text-graphite">{handle}</span>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-label text-ink"
      >
        Ver perfil
        <ArrowMark className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={5} />
      </a>
    </div>
  );
}
