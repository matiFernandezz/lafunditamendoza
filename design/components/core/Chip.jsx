import React from 'react';
/** Píldora seleccionable: color de variante (44px) o sub-modelo de iPhone. */
export function Chip({ children, selected = false, size = 'md', href, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  const on = selected;
  const s = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: size === 'md' ? 'var(--chip-h)' : undefined, padding: size === 'md' ? '0 16px' : '8px 16px',
    borderRadius: 'var(--radius-pill)', border: '1px solid ' + (on || hover ? 'var(--ink)' : 'var(--graphite)'),
    background: on || (hover && size === 'sm') ? 'var(--ink)' : 'transparent',
    color: on || (hover && size === 'sm') ? 'var(--paper)' : 'var(--ink)',
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-small)', fontWeight: 500, textTransform: size === 'md' ? 'capitalize' : 'none',
    cursor: 'pointer', transition: 'background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast)',
    textDecoration: 'none', whiteSpace: 'nowrap', boxSizing: 'border-box', ...style,
  };
  const p = { style: s, onClick, onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) };
  return href ? <a href={href} {...p}>{children}</a> : <button type="button" aria-pressed={on} {...p}>{children}</button>;
}
