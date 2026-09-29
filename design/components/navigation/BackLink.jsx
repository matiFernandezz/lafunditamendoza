import React from 'react';
import { ArrowMark } from '../brand/ArrowMark.jsx';
/** Enlace "Inicio" con flecha girada; grafito → tinta en hover. */
export function BackLink({ children = 'Inicio', href = '#', onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <a href={href} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, margin: '-4px 0', fontFamily: 'var(--font-body)', fontSize: 'var(--text-small)', color: h ? 'var(--ink)' : 'var(--graphite)', transition: 'color var(--dur-fast)' }}>
      <ArrowMark width={16} height={10} strokeWidth={5} direction="left" />{children}
    </a>
  );
}
