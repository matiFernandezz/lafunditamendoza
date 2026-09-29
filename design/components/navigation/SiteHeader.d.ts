export interface NavLink { key?: string; label: string; href?: string; active?: boolean }
/**
 * Header negro con logo y categorías.
 * @startingPoint section="Navigation" subtitle="Header sticky con logo y menú mobile" viewport="700x320"
 */
export interface SiteHeaderProps {
  /** Categorías de tope + "Nosotros". */
  links?: NavLink[];
  logoSrc?: string;
  homeHref?: string;
  /** Si se pasa, intercepta clicks (prototipos). Recibe el link (key 'home' para el logo). */
  onNavigate?: (link: NavLink) => void;
  /** auto = breakpoint 768px. */
  layout?: 'auto' | 'mobile' | 'desktop';
  sticky?: boolean;
}
export declare function SiteHeader(props: SiteHeaderProps): JSX.Element;
