export interface HeroSlide {
  /** Foto a sangre (opcional si el slide es sólo fondo + contenido). */
  src?: string;
  alt?: string;
  position?: string;
  /** Oscurecer la foto para texto/logo encima, p.ej. 0.55. */
  dim?: number;
  /** Fondo del slide, p.ej. 'var(--paper)' para el slide tipográfico. */
  background?: string;
  /** 'light' = fondo claro → contador y flechas en tinta. Default oscuro. */
  tone?: 'dark' | 'light';
  /** Capa propia: logo, titular, RangeHero, CTA. */
  content?: React.ReactNode;
}
/**
 * Hero carrusel full-bleed de la home.
 * @startingPoint section="Catálogo" subtitle="Carrusel hero: foto + logo, tipográfico, titular" viewport="700x500"
 */
export interface HeroCarouselProps {
  slides?: HeroSlide[];
  /** 4/5 mobile, 16/9 tablet, 1584/722 desktop. */
  aspect?: string;
  interval?: number;
  objectPosition?: string;
  /** Capa fija sobre todos los slides. */
  children?: React.ReactNode;
}
export declare function HeroCarousel(props: HeroCarouselProps): JSX.Element;
