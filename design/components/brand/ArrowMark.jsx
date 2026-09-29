import React from 'react';
/** Flecha de trazo cuadrado con junta en inglete (copiada de ArrowMark.tsx). */
export function ArrowMark({ width = 16, height = 10, strokeWidth = 5, direction = 'right', style }) {
  return (
    <svg viewBox="0 0 64 40" width={width} height={height} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, transform: direction === 'left' ? 'rotate(180deg)' : undefined, ...style }}>
      <path pathLength={1} d="M4 20H58M42 4L58 20L42 36" />
    </svg>
  );
}
