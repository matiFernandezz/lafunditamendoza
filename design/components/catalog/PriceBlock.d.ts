export interface PriceBlockProps {
  /** Número (se formatea es-AR ARS sin decimales) o string ya formateado. */
  price: number | string;
  stock?: number;
  sku?: string;
  /** Umbral de "Quedan N". Default 3. */
  lowStock?: number;
  divider?: boolean;
}
export declare function PriceBlock(props: PriceBlockProps): JSX.Element;
