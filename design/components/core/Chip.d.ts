export interface ChipProps {
  children?: React.ReactNode;
  selected?: boolean;
  /** md = chip de color (44px, capitalize, hover solo borde). sm = sub-modelo (py 8, hover invierte a tinta). */
  size?: 'md' | 'sm';
  href?: string;
  onClick?: (e: any) => void;
  style?: React.CSSProperties;
}
export declare function Chip(props: ChipProps): JSX.Element;
