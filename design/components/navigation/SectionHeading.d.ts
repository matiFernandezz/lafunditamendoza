export interface SectionHeadingProps {
  /** Etiqueta chica en mayúsculas, p.ej. "COLECCIÓN DESTACADA". */
  label?: string;
  title: React.ReactNode;
  /** section = 30→36px ("Recién llegados."); headline = 24px ("Elegí por categoría"). */
  size?: 'section' | 'headline';
  tone?: 'ink' | 'paper';
  /** Slot a la derecha (p.ej. link "VER TODO"). */
  action?: React.ReactNode;
}
export declare function SectionHeading(props: SectionHeadingProps): JSX.Element;
