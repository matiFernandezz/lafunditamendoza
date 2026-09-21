// Flecha dibujada (trazo cuadrado, junta en inglete) para que su grosor acompañe al display.
export default function ArrowMark({
  className,
  strokeWidth = 6,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
    >
      <path pathLength={1} d="M4 20H58M42 4L58 20L42 36" />
    </svg>
  );
}
