export interface IphoneModel { name: string; href?: string }
export interface ModelLine { label: string; models?: IphoneModel[] }
/**
 * Franja de modelos de la home.
 * @startingPoint section="Catálogo" subtitle="Franja 'Elegí tu iPhone' 11 → 18" viewport="700x260"
 */
export interface ModelStripProps {
  /** Una por línea: {label:'17', models:[{name:'iPhone 17'},{name:'iPhone 17 Pro'},{name:'iPhone 17 Pro Max'},{name:'iPhone Air'}]}. El Air va dentro de la línea 17. Una línea con un solo modelo va directo. */
  lines?: ModelLine[];
  onSelectModel?: (model: IphoneModel) => void;
  label?: string;
}
export declare function ModelStrip(props: ModelStripProps): JSX.Element;
