import React from 'react';
/** Hero carrusel a sangre: cada slide es una foto, un fondo liso, contenido propio, o combinación. Crossfade 700ms cada 6s. */
export function HeroCarousel({ slides = [], aspect = '4/5', interval = 6000, objectPosition = 'left center', children }) {
  const [i, setI] = React.useState(0);
  const n = slides.length;
  React.useEffect(() => { if (n <= 1) return; const t = setInterval(() => setI((x) => (x + 1) % n), interval); return () => clearInterval(t); }, [n, interval, i]);
  const light = slides[i] && slides[i].tone === 'light';
  const fg = light ? 'var(--ink)' : 'var(--paper)';
  const btn = (side) => ({ position: 'absolute', top: '50%', [side]: 8, transform: 'translateY(-50%)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9999, border: 'none', background: light ? 'rgb(18 18 18 / .06)' : 'rgb(18 18 18 / .28)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: fg, cursor: 'pointer', fontSize: 26, lineHeight: 1, padding: '0 0 3px', transition: 'color var(--dur-hero), background var(--dur-hero)' });
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--ink)', aspectRatio: aspect, width: '100%' }}>
      {slides.map((s, k) => (
        <div key={k} aria-hidden={k !== i} style={{ position: 'absolute', inset: 0, background: s.background || 'transparent', opacity: k === i ? 1 : 0, pointerEvents: k === i ? 'auto' : 'none', transition: 'opacity var(--dur-hero)' }}>
          {s.src && <img src={s.src} alt={s.alt || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: s.position || objectPosition, filter: s.dim ? 'brightness(' + s.dim + ')' : undefined }} />}
          {s.content && <div style={{ position: 'absolute', inset: 0 }}>{s.content}</div>}
        </div>
      ))}
      {children && <div style={{ position: 'absolute', inset: 0 }}>{children}</div>}
      {n > 1 && (
        <>
          <button type="button" aria-label="Slide anterior" style={btn('left')} onClick={() => setI((x) => (x - 1 + n) % n)}>‹</button>
          <button type="button" aria-label="Slide siguiente" style={btn('right')} onClick={() => setI((x) => (x + 1) % n)}>›</button>
          <div style={{ position: 'absolute', right: 'var(--page-pad)', bottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: fg, transition: 'color var(--dur-hero)' }}>
            <div style={{ width: 64, height: 1, background: light ? 'var(--rule)' : 'var(--paper-40)', overflow: 'hidden' }}><div style={{ height: '100%', background: fg, width: ((i + 1) / n) * 100 + '%', transition: 'width var(--dur-progress)' }}></div></div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          </div>
        </>
      )}
    </section>
  );
}
