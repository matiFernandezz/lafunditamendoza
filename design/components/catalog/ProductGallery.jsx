import React from 'react';
/** Galería del detalle: swipe con snap, puntos (≤2 fotos) o miniaturas (>2). Fotos en rectángulo simple. */
export function ProductGallery({ images = [], alt = '', aspect = '4/5' }) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(0);
  const box = { position: 'relative', aspectRatio: aspect, width: '100%', flexShrink: 0, scrollSnapAlign: 'start', background: 'var(--surface-photo-empty)', overflow: 'hidden' };
  const img = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  if (!images.length) return <div style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', color: 'var(--graphite)' }}>Sin foto</div>;
  if (images.length === 1) return <div style={box}><img src={images[0]} alt={alt} style={img} /></div>;
  const to = (i) => { const el = ref.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); };
  const onScroll = () => { const el = ref.current; if (el && el.clientWidth) setActive(Math.round(el.scrollLeft / el.clientWidth)); };
  const arrow = (side, dis, fn, ch) => <button type="button" onClick={fn} disabled={dis} aria-label={side === 'left' ? 'Foto anterior' : 'Foto siguiente'}
    style={{ position: 'absolute', [side]: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 9999, border: 'none', background: 'var(--paper-90)', color: 'var(--ink)', fontSize: 20, lineHeight: 1, cursor: 'pointer', opacity: dis ? .4 : 1 }}>{ch}</button>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <div ref={ref} onScroll={onScroll} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
          {images.map((s, i) => <div key={i} style={box}><img src={s} alt={alt} style={img} /></div>)}
        </div>
        {arrow('left', active === 0, () => to(Math.max(0, active - 1)), '‹')}
        {arrow('right', active === images.length - 1, () => to(Math.min(images.length - 1, active + 1)), '›')}
      </div>
      {images.length > 2 ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {images.map((s, i) => <button key={i} type="button" onClick={() => to(i)} aria-label={'Ir a la foto ' + (i + 1)} aria-current={i === active}
            style={{ position: 'relative', width: 64, height: 64, flexShrink: 0, padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-photo)', border: '1px solid ' + (i === active ? 'var(--ink)' : 'var(--rule)'), background: 'none', cursor: 'pointer' }}><img src={s} alt="" style={img} /></button>)}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {images.map((s, i) => <button key={i} type="button" onClick={() => to(i)} aria-label={'Ir a la foto ' + (i + 1)} style={{ width: 6, height: 6, padding: 0, border: 'none', borderRadius: 9999, background: i === active ? 'var(--ink)' : 'var(--rule)', cursor: 'pointer' }}></button>)}
        </div>
      )}
    </div>
  );
}
