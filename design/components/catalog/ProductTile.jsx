import React from 'react';
/** Card de producto: foto en rectángulo simple + nombre (Space Grotesk) + precio (mono). */
export function ProductTile({ name, price, image, href = '#', onClick, aspect = '4/5' }) {
  const [h, setH] = React.useState(false);
  return (
    <a href={href} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: 'block', color: 'var(--ink)' }}>
      <div style={{ position: 'relative', aspectRatio: aspect, width: '100%', overflow: 'hidden', borderRadius: 'var(--radius-photo)', background: 'var(--surface-photo-empty)' }}>
        {image ? <img src={image} alt={name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: h ? 'scale(var(--hover-zoom-photo))' : 'none', transition: 'transform var(--dur-image) ease' }} />
          : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 'var(--text-small)', color: 'var(--graphite)' }}>Sin foto</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 12 }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 600, lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--tracking-tight)', textDecoration: h ? 'underline' : 'none', textUnderlineOffset: 3 }}>{name}</p>
        {price != null && <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--graphite)', fontVariantNumeric: 'tabular-nums' }}>{price}</p>}
      </div>
    </a>
  );
}
