export interface SelectOption { value: string; label: string }
export interface SelectProps {
  /** Etiqueta visible encima, p.ej. "Elegí tu iPhone". */
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<string | SelectOption>;
  /** Opción vacía inicial, p.ej. "Todos los modelos". */
  placeholder?: string;
  id?: string;
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
