import ArrowMark from "../ArrowMark";
import ScrollRow from "../about/ScrollRow";

/**
 * Comunidad: las capturas de clientes (verticales, como las historias) en un
 * carrusel, con el título y el subtítulo arriba y un botón al perfil debajo.
 * Todos los textos se editan en el panel › Tienda › Comunidad.
 */
export default function CommunityStories({
  title,
  subtitle,
  photos,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  subtitle: string;
  photos: string[];
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="space-y-2 text-center">
        <h3 className="font-display text-[clamp(1.625rem,0.75rem+1.6vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink [text-wrap:balance]">
          {title}
        </h3>
        {subtitle && <p className="text-base text-graphite md:text-lg">{subtitle}</p>}
      </div>
      {photos.length > 0 && (
        <ScrollRow itemClassName="w-[min(220px,56vw)]">
          {photos.map((src) => (
            <div key={src} className="aspect-[9/16] overflow-hidden rounded-2xl bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- capturas subidas desde el panel, de tamaños distintos. */}
              <img src={src} alt="Cliente con su funda de La Fundita" loading="lazy" className="size-full object-cover" />
            </div>
          ))}
        </ScrollRow>
      )}
      <div className="flex justify-center">
        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-ink px-8 text-xs font-semibold uppercase tracking-label text-paper transition-opacity duration-200 hover:opacity-90"
        >
          {ctaLabel}
          <ArrowMark className="h-2.5 w-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={5} />
        </a>
      </div>
    </div>
  );
}
