/**
 * Mosaico de categoría con foto.
 * @startingPoint section="Catálogo" subtitle="Mosaico de categoría con índice 01–05" viewport="700x420"
 */
export interface CategoryTileProps {
  name: string;
  /** 1-based; se muestra "01". */
  index?: number;
  image?: string;
  href?: string;
  onClick?: (e: any) => void;
  aspect?: string;
}
export declare function CategoryTile(props: CategoryTileProps): JSX.Element;
