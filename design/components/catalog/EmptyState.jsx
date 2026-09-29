import React from 'react';
/** Aviso vacío con borde discontinuo en regla. */
export function EmptyState({ children, align = 'center' }) {
  return <p style={{ margin: 0, borderRadius: 'var(--radius-container)', border: '1px dashed var(--rule)', padding: 32, textAlign: align, fontFamily: 'var(--font-body)', color: 'var(--graphite)' }}>{children}</p>;
}
