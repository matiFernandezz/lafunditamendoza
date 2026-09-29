/**
 * Hero tipográfico "iPhone 11 → 18 Pro Max".
 * @startingPoint section="Catálogo" subtitle="Hero tipográfico del rango de modelos" viewport="700x360"
 */
export interface RangeHeroProps {
  from?: string;
  to?: string;
  /** Texto de apoyo (Plex Sans 300), máx. 34ch. */
  lead?: string;
  /** Subida enmascarada 700ms + flecha dibujada. Respeta prefers-reduced-motion. */
  animate?: boolean;
  tone?: 'ink' | 'paper';
}
export declare function RangeHero(props: RangeHeroProps): JSX.Element;
