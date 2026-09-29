export interface LogoProps {
  /** Lado en px. Header: 44. */
  size?: number;
  /** Ruta a la imagen (relativa a la página). Default 'assets/logo-black.jpg'. */
  src?: string;
  /** 'black' = JPG con fondo negro quemado (usar sobre #000). 'transparent' = PNG blanco sin fondo. */
  variant?: 'black' | 'transparent';
  alt?: string;
  /** Recorta el aire del JPG: la marca llena la caja (ancho = size × 0.875). Usar en header y tamaños < 120px. */
  crop?: boolean;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): JSX.Element;
