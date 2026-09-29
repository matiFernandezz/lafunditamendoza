export interface ArrowMarkProps {
  width?: number;
  height?: number;
  /** 5 para links chicos, 6 en el hero. */
  strokeWidth?: number;
  direction?: 'right' | 'left';
  style?: React.CSSProperties;
}
export declare function ArrowMark(props: ArrowMarkProps): JSX.Element;
