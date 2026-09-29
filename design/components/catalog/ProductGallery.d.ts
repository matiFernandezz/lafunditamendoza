export interface ProductGalleryProps {
  /** URLs ordenadas. 1 = foto fija; 2 = swipe + puntos; 3+ = swipe + miniaturas. */
  images?: string[];
  alt?: string;
  aspect?: string;
}
export declare function ProductGallery(props: ProductGalleryProps): JSX.Element;
