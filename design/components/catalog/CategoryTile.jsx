import React from 'react';
import { ArrowMark } from '../brand/ArrowMark.jsx';
/** Mosaico de categoría: foto a sangre, velo de tinta abajo, nombre arriba e índice grande abajo. */
export function CategoryTile({ name, index = 1, image, href = '#', onClick, aspect = '4/5' }) {
  const [h, setH] = React.useState(false);
  const lab = { fontFamily:'var(--font-body)',fontSize:'var(--text-xs)',fontWeight:600,letterSpacing:'var(--tracking-label)',textTransform:'uppercase' };
  return (
    <a href={href} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', aspectRatio: aspect, overflow: 'hidden', background: 'var(--surface-tile-fallback)', color: 'var(--paper)', borderRadius: 'var(--radius-photo)' }}>
      {image && <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .8, transform: h ? 'scale(var(--hover-zoom-tile))' : 'none', transition: 'transform var(--dur-image) ease' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--scrim-photo)' }}></div>
      <div style={{ position: 'relative', padding: 16, maxWidth: '12ch', ...lab }}>{name}</div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: 16 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-section)', fontWeight: 600, lineHeight: 1, letterSpacing: 'var(--tracking-tight)', fontVariantNumeric: 'tabular-nums' }}>{String(index).padStart(2, '0')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...lab }}>Ver más<ArrowMark width={16} height={10} strokeWidth={5} style={{ transform: h ? 'translateX(2px)' : 'none', transition: 'transform var(--dur-fast)' }} /></span>
      </div>
    </a>
  );
}
