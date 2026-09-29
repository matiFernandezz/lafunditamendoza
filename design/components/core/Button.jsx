import React from 'react';
/** Botón primario de 56px, tinta sobre papel. Presionado escala a 0.98. */
export function Button({ children, variant = 'primary', href, onClick, fullWidth = false, disabled = false, type = 'button', style }) {
  const [pressed, setPressed] = React.useState(false);
  const inverse = variant === 'inverse';
  const s = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 'var(--control-h)', padding: '0 24px', width: fullWidth ? '100%' : undefined,
    borderRadius: 'var(--radius-control)', border: variant === 'outline' ? '1px solid var(--border-control)' : 'none',
    background: variant === 'outline' ? 'transparent' : inverse ? 'var(--paper)' : 'var(--ink)',
    color: variant === 'outline' || inverse ? 'var(--ink)' : 'var(--paper)',
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
    transform: pressed && !disabled ? 'scale(var(--press-scale))' : 'none',
    transition: 'transform var(--dur-fast) ease', textDecoration: 'none', boxSizing: 'border-box', ...style,
  };
  const h = { onPointerDown: () => setPressed(true), onPointerUp: () => setPressed(false), onPointerLeave: () => setPressed(false) };
  if (href && !disabled) return <a href={href} onClick={onClick} style={s} {...h}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} style={s} {...h}>{children}</button>;
}
