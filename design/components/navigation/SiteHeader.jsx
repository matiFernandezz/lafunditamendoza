import React from 'react';
import { Logo } from '../brand/Logo.jsx';

function useIsDesktop(layout) {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 768px)') : null;
  const [d, setD] = React.useState(q ? q.matches : false);
  React.useEffect(() => { if (!q) return; const f = (e) => setD(e.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []);
  return layout === 'desktop' ? true : layout === 'mobile' ? false : d;
}

/** Header sticky negro puro (80px): logo, nav de categorías, menú hamburguesa en mobile. */
export function SiteHeader({ links = [], logoSrc = 'assets/logo-black.jpg', homeHref = '#', onNavigate, layout = 'auto', sticky = true }) {
  const desktop = useIsDesktop(layout);
  const [open, setOpen] = React.useState(false);
  const go = (l) => (e) => { if (onNavigate) { e.preventDefault(); onNavigate(l); } setOpen(false); };
  return (
    <header style={{ position: sticky ? 'sticky' : 'relative', top: 0, zIndex: 20, background: 'var(--surface-header)', color: 'var(--paper)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: 'var(--header-h)', padding: desktop ? '0 clamp(48px, 9vw, 180px)' : '0 calc(var(--page-pad) + 12px)' }}>
        <a href={homeHref} onClick={go({ key: 'home', href: homeHref })} aria-label="La Fundita — inicio" style={{ display: 'flex' }}><Logo crop size={desktop ? 60 : 56} src={logoSrc} /></a>
        {desktop ? (
          <nav aria-label="Categorías" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {links.map((l) => <NavItem key={l.label} l={l} onClick={go(l)} />)}
          </nav>
        ) : (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--paper)', cursor: 'pointer', padding: 0 }}>
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{open ? 'Cerrar menú' : 'Abrir menú'}</span>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        )}
      </div>
      {!desktop && open && (
        <nav aria-label="Categorías" style={{ borderTop: '1px solid var(--paper-15)', padding: '8px var(--page-pad)' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {links.map((l, i) => (
              <li key={l.label} style={{ borderBottom: i === links.length - 1 ? 'none' : '1px solid var(--paper-10)' }}>
                <a href={l.href || '#'} onClick={go(l)} style={{ display: 'flex', alignItems: 'center', minHeight: 56, fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)', fontWeight: 600, letterSpacing: 'var(--tracking-tight)', color: 'var(--paper)' }}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function NavItem({ l, onClick }) {
  const [h, setH] = React.useState(false);
  return <a href={l.href || '#'} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-small)', fontWeight: 600, letterSpacing: '.025em', color: h || l.active ? 'var(--paper)' : 'var(--paper-85)', transition: 'color var(--dur-fast)' }}>{l.label}</a>;
}
