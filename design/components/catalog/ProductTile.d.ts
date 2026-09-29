/**
 * Card de producto para grillas de 2 columnas (mobile).
 * @startingPoint section="Catálogo" subtitle="Card de producto: foto + nombre + precio" viewport="700x420"
 */
export interface ProductTileProps {
  name: string;
  /** Ya formateado: "$ 18.500" o "Desde $ 15.000". */
  price?: string;
  image?: string;
  href?: string;
  onClick?: (e: any) => void;
  /** CSS aspect-ratio de la foto. Default '4/5'. */
  aspect?: string;
}
export declare function ProductTile(props: ProductTileProps): JSX.Element;
