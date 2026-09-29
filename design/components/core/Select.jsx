import React from 'react';
/** Select nativo de 56px con etiqueta visible y chevron de terminal cuadrada. */
export function Select({ label, value, onChange, options = [], placeholder, id: idProp, style }) {
  const [hover, setHover] = React.useState(false);
  const [autoId] = React.useState(() => 'select-' + Math.random().toString(36).slice(2, 7));
  const id = idProp || autoId;
  return (
    <div style={style}>
      {label && <label htmlFor={id} style={{ display: 'block', marginBottom: 8, fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 'var(--text-body)', color: 'var(--ink)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <select id={id} value={value} onChange={(e) => onChange && onChange(e.target.value)}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          style={{ height: 'var(--control-h)', width: '100%', appearance: 'none', WebkitAppearance: 'none', borderRadius: 'var(--radius-control)',
            border: '1px solid ' + (hover ? 'var(--ink)' : 'var(--graphite)'), background: 'transparent', padding: '0 48px 0 16px',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', fontWeight: 500, color: 'var(--ink)', transition: 'border-color var(--dur-fast)', cursor: 'pointer' }}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => { const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label; return <option key={v} value={v}>{l}</option>; })}
        </select>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" aria-hidden="true"
          style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink)' }}>
          <path d="M3 6l5 5 5-5" />
        </svg>
      </div>
    </div>
  );
}
