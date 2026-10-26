import Link from "next/link";
import ArrowMark from "../ArrowMark";

/**
 * Título de las secciones de la home. Display de la marca (Space Grotesk),
 * en minúscula normal y apretado, como el hero: nada de mayúsculas con
 * tracking (DESIGN.md). Debajo, una línea que separa el título del contenido
 * (un poco más marcada que la regla de las cards). A la derecha, opcional, un
 * link discreto en grafito ("Ver todo →").
 */
export default function HomeSectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-graphite/30 pb-3 lg:pb-4">
      <h2 className="font-display text-[clamp(1.625rem,0.75rem+1.6vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink [text-wrap:balance]">
        {children}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="group -my-2 inline-flex min-h-11 shrink-0 items-center gap-2 text-sm text-graphite transition-colors duration-200 hover:text-ink"
        >
          {action.label}
          <ArrowMark className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={5} />
        </Link>
      )}
    </div>
  );
}
