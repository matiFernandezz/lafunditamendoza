export interface PageHeaderProps {
  title: React.ReactNode;
  /** Categoría padre, en grafito con " / ". */
  parent?: string;
  /** Número → "N productos"; string se muestra tal cual. */
  count?: number | string;
  /** p.ej. "para iPhone 15". */
  countSuffix?: string;
  backHref?: string;
  backLabel?: string;
  onBack?: (e: any) => void;
  showBack?: boolean;
}
export declare function PageHeader(props: PageHeaderProps): JSX.Element;
