/**
 * Botón de 56px de alto, radio 16px.
 * @startingPoint section="Core" subtitle="Botón primario tinta / outline" viewport="700x300"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** primary = tinta; outline = borde grafito; inverse = papel sobre fondos oscuros. */
  variant?: 'primary' | 'outline' | 'inverse';
  /** Si se pasa, renderiza <a>. */
  href?: string;
  onClick?: (e: any) => void;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
