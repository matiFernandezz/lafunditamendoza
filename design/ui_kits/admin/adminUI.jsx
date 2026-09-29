// Primitivas del panel (locales al kit): 48px de alto táctil, radio 6px, colores --admin-*.
const admS = {
  label: { display:'block', fontFamily:'var(--font-body)', fontSize:'var(--admin-label)', fontWeight:600, color:'var(--admin-text)', marginBottom:6 },
  muted: { fontFamily:'var(--font-body)', fontSize:'var(--admin-meta)', color:'var(--admin-muted)' },
  cap: { fontFamily:'var(--font-body)', fontSize:12, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--admin-muted)' },
  mono: { fontFamily:'var(--font-mono)', fontVariantNumeric:'tabular-nums' },
  body: { fontFamily:'var(--font-body)', fontSize:'var(--admin-body)', color:'var(--admin-text)' },
};

const kebabToCamel = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]));
function Icon({ name, size = 20, stroke = 1.75, style }) {
  const L = window.lucide;
  const node = L && ((L.icons && L.icons[name]) || L[name]);
  if (!node) return <span aria-hidden="true" style={{ display:'inline-block', width:size, height:size, flexShrink:0, ...style }}></span>;
  const kids = node[0] === 'svg' ? node[2] : node;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display:'block', flexShrink:0, ...style }}>
      {kids.map(([tag, attrs], i) => React.createElement(tag, { key:i, ...kebabToCamel(attrs) }))}
    </svg>
  );
}

function Btn({ children, kind = 'primary', size = 'md', full, icon, disabled, onClick, type = 'button', style, title }) {
  const [p, setP] = React.useState(false);
  const h = { lg:'var(--admin-cta-h)', md:'var(--admin-control-h)', sm:'var(--admin-control-h-sm)' }[size];
  let [bg, fg, bd] = {
    primary:['var(--admin-ink)','#fff','var(--admin-ink)'],
    secondary:['var(--admin-surface)','var(--admin-text)','var(--admin-border-strong)'],
    danger:['var(--admin-danger)','#fff','var(--admin-danger)'],
    dangerOutline:['var(--admin-surface)','var(--admin-danger)','var(--admin-danger-border)'],
    ghost:['transparent','var(--admin-text)','transparent'],
  }[kind];
  const solid = kind === 'primary' || kind === 'danger';
  if (disabled && solid) { bg = 'var(--admin-disabled-bg)'; fg = 'var(--admin-disabled-fg)'; bd = 'var(--admin-disabled-bg)'; }
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      onPointerDown={() => setP(true)} onPointerUp={() => setP(false)} onPointerLeave={() => setP(false)}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, height:h, minWidth:h, padding:size === 'sm' ? '0 14px' : '0 20px', width:full ? '100%' : undefined, boxSizing:'border-box',
        borderRadius:'var(--admin-radius)', border:'1px solid ' + bd, background:bg, color:fg, fontFamily:'var(--font-body)', fontSize:size === 'lg' ? 17 : size === 'sm' ? 14 : 15, fontWeight:600,
        cursor:disabled ? 'default' : 'pointer', opacity:disabled && !solid ? .45 : 1, transform:p && !disabled ? 'scale(.98)' : 'none', transition:'transform var(--dur-fast), background var(--dur-fast)', whiteSpace:'nowrap', ...style }}>
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}{children}
    </button>
  );
}

function IconBtn({ icon, label, onClick, disabled, kind = 'plain', size = 44 }) {
  const danger = kind === 'danger';
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      style={{ width:size, height:size, flexShrink:0, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:'var(--admin-radius)',
        border:kind === 'plain' ? '1px solid transparent' : '1px solid var(--admin-border-strong)', background:kind === 'plain' ? 'transparent' : 'var(--admin-surface)',
        color:danger ? 'var(--admin-danger)' : 'var(--admin-text)', cursor:disabled ? 'default' : 'pointer', opacity:disabled ? .3 : 1, padding:0 }}>
      <Icon name={icon} size={20} />
    </button>
  );
}

function Input({ value, onChange, placeholder, type = 'text', prefix, suffix, inputMode, align = 'left', autoFocus, state, mono, onEnter, style, id, ariaLabel, digits }) {
  const [f, setF] = React.useState(false);
  const bd = state === 'ok' ? 'var(--admin-ok)' : state === 'error' ? 'var(--admin-danger)' : (f || state === 'dirty') ? 'var(--admin-ink)' : 'var(--admin-border-strong)';
  const iconPre = prefix && typeof prefix !== 'string';
  return (
    <div style={{ position:'relative', minWidth:0, ...style }}>
      {prefix && <span style={{ position:'absolute', left:iconPre ? 14 : 12, top:0, bottom:0, display:'flex', alignItems:'center', color:'var(--admin-muted)', pointerEvents:'none', ...admS.mono, fontSize:15 }}>{prefix}</span>}
      <input id={id} aria-label={ariaLabel} type={type} inputMode={inputMode || (digits ? 'numeric' : undefined)} value={value} autoFocus={autoFocus} placeholder={placeholder}
        onChange={(e) => onChange && onChange(digits ? e.target.value.replace(/[^\d]/g, '') : e.target.value)}
        onFocus={() => setF(true)} onBlur={() => setF(false)} onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        style={{ height:'var(--admin-control-h)', width:'100%', boxSizing:'border-box', borderRadius:'var(--admin-radius)', border:'1px solid ' + bd, background:'var(--admin-surface)',
          paddingLeft:prefix ? (iconPre ? 44 : 28) : 14, paddingRight:suffix ? 40 : 14, textAlign:align, fontFamily:mono ? 'var(--font-mono)' : 'var(--font-body)',
          fontVariantNumeric:mono ? 'tabular-nums' : undefined, fontSize:16, color:'var(--admin-text)', outline:'none', transition:'border-color var(--dur-fast)' }} />
      {suffix && <span style={{ position:'absolute', right:14, top:0, bottom:0, display:'flex', alignItems:'center', color:'var(--admin-muted)', pointerEvents:'none', ...admS.mono, fontSize:15 }}>{suffix}</span>}
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, id, autoFocus }) {
  const [f, setF] = React.useState(false);
  return <textarea id={id} rows={rows} value={value} autoFocus={autoFocus} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
    style={{ width:'100%', boxSizing:'border-box', borderRadius:'var(--admin-radius)', border:'1px solid ' + (f ? 'var(--admin-ink)' : 'var(--admin-border-strong)'), background:'#fff', padding:12, fontFamily:'var(--font-body)', fontSize:16, lineHeight:1.45, color:'var(--admin-text)', outline:'none', resize:'vertical' }}></textarea>;
}

function Field({ label, htmlFor, hint, children, style }) {
  return <div style={style}>{label && <label htmlFor={htmlFor} style={admS.label}>{label}</label>}{children}{hint && <p style={{ ...admS.muted, margin:'6px 0 0' }}>{hint}</p>}</div>;
}

function SearchInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ position:'relative' }}>
      <Input value={value} onChange={onChange} placeholder={placeholder} prefix={<Icon name="Search" size={20} />} type="search" ariaLabel={placeholder} autoFocus={autoFocus} />
      {value && <span style={{ position:'absolute', right:2, top:2 }}><IconBtn icon="X" label="Borrar búsqueda" onClick={() => onChange('')} /></span>}
    </div>
  );
}

function NativeSelect({ value, onChange, children, id, ariaLabel }) {
  return (
    <div style={{ position:'relative' }}>
      <select id={id} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ height:'var(--admin-control-h)', width:'100%', appearance:'none', WebkitAppearance:'none', borderRadius:'var(--admin-radius)', border:'1px solid var(--admin-border-strong)', background:'#fff', padding:'0 44px 0 14px', fontFamily:'var(--font-body)', fontSize:16, color:'var(--admin-text)', cursor:'pointer' }}>{children}</select>
      <span style={{ position:'absolute', right:14, top:0, bottom:0, display:'flex', alignItems:'center', pointerEvents:'none', color:'var(--admin-muted)' }}><Icon name="ChevronDown" size={18} /></span>
    </div>
  );
}

function Seg({ options, value, onChange, cols, h = 'var(--admin-control-h)', ariaLabel }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display:'grid', gridTemplateColumns:`repeat(${cols || options.length}, minmax(0,1fr))`, gap:8 }}>
      {options.map((o) => { const on = o.value === value; return (
        <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
          style={{ height:h, display:'flex', alignItems:'center', justifyContent:'center', gap:8, borderRadius:'var(--admin-radius)', border:'1px solid ' + (on ? 'var(--admin-ink)' : 'var(--admin-border-strong)'),
            background:on ? 'var(--admin-ink)' : '#fff', color:on ? '#fff' : 'var(--admin-text)', fontFamily:'var(--font-body)', fontSize:15, fontWeight:600, cursor:'pointer', padding:'0 8px', whiteSpace:'nowrap', transition:'background var(--dur-fast), color var(--dur-fast)' }}>
          {o.icon && <Icon name={o.icon} size={20} />}{o.label}
        </button>
      ); })}
    </div>
  );
}

function Chip({ active, onClick, children, style }) {
  return <button type="button" aria-pressed={!!active} onClick={onClick} style={{ height:44, flexShrink:0, padding:'0 16px', borderRadius:9999, border:'1px solid ' + (active ? 'var(--admin-ink)' : 'var(--admin-border-strong)'), background:active ? 'var(--admin-ink)' : '#fff', color:active ? '#fff' : 'var(--admin-text)', fontFamily:'var(--font-body)', fontSize:15, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', ...style }}>{children}</button>;
}

function ChipRow({ options, value, onChange, wrap }) {
  return (
    <div style={{ display:'flex', gap:8, overflowX:wrap ? 'visible' : 'auto', flexWrap:wrap ? 'wrap' : 'nowrap', margin:wrap ? 0 : '0 -16px', padding:wrap ? 0 : '0 16px 2px', scrollbarWidth:'none' }}>
      {options.map((o) => <Chip key={o.value} active={o.value === value} onClick={() => onChange(o.value)}>{o.label}</Chip>)}
    </div>
  );
}

function Card({ children, pad = 16, style }) {
  return <div style={{ background:'var(--admin-surface)', border:'1px solid var(--admin-border)', borderRadius:'var(--admin-radius)', padding:pad, boxSizing:'border-box', minWidth:0, ...style }}>{children}</div>;
}

function Badge({ kind = 'neutral', children }) {
  const k = { neutral:['#f5f5f5','var(--admin-text)','var(--admin-border)'], danger:['var(--admin-danger-bg)','var(--admin-danger)','var(--admin-danger-border)'], ok:['var(--admin-ok-bg)','var(--admin-ok)','#a7f3d0'], ink:['var(--admin-ink)','#fff','var(--admin-ink)'], warn:['#fffbeb','var(--admin-warn)','#fde68a'] }[kind];
  return <span style={{ display:'inline-flex', alignItems:'center', height:22, padding:'0 8px', borderRadius:9999, background:k[0], color:k[1], border:'1px solid ' + k[2], fontFamily:'var(--font-body)', fontSize:11, fontWeight:700, letterSpacing:'.04em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{children}</span>;
}

function Stepper({ value, onChange, min = 0, max = Infinity }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
      <IconBtn kind="outline" icon="Minus" label="Restar uno" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} />
      <span style={{ ...admS.mono, minWidth:32, textAlign:'center', fontSize:17, fontWeight:600, color:'var(--admin-text)' }}>{value}</span>
      <IconBtn kind="outline" icon="Plus" label="Sumar uno" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} />
    </div>
  );
}

function Sheet({ open, onClose, title, dk, center, children, width = 440 }) {
  if (!open) return null;
  const mid = dk || center;
  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:60, background:'rgb(0 0 0 / .45)', display:'flex', alignItems:mid ? 'center' : 'flex-end', justifyContent:'center', padding:mid ? 16 : 0 }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        style={{ width:mid ? '100%' : 'min(100%, 430px)', maxWidth:mid ? width : undefined, maxHeight:mid ? '88vh' : '92vh', overflowY:'auto', background:'#fff', borderRadius:mid ? 8 : '14px 14px 0 0', boxSizing:'border-box' }}>
        {!mid && <div style={{ width:40, height:4, borderRadius:2, background:'#d4d4d4', margin:'8px auto 0' }}></div>}
        {title && <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:mid ? '16px 16px 0 24px' : '8px 8px 0 16px' }}>
          <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontWeight:600, fontSize:20, letterSpacing:'-.01em', color:'var(--admin-text)' }}>{title}</h2>
          <IconBtn icon="X" label="Cerrar" onClick={onClose} />
        </div>}
        <div style={{ padding:mid ? '12px 24px 24px' : '8px 16px 24px' }}>{children}</div>
      </div>
    </div>, document.body);
}

function Notice({ kind = 'ink', children, onClose }) {
  const k = { ink:['var(--admin-ink)','#fff'], ok:['var(--admin-ok-bg)','var(--admin-ok)'], danger:['var(--admin-danger-bg)','var(--admin-danger)'] }[kind];
  return (
    <div role="status" style={{ display:'flex', alignItems:'center', gap:12, minHeight:48, padding:'10px 8px 10px 14px', borderRadius:'var(--admin-radius)', background:k[0], color:k[1], fontFamily:'var(--font-body)', fontSize:14, fontWeight:500, lineHeight:1.4, border:kind === 'danger' ? '1px solid var(--admin-danger-border)' : 'none' }}>
      <Icon name={kind === 'danger' ? 'CircleAlert' : 'CircleCheck'} size={20} />
      <span style={{ flex:1, minWidth:0 }}>{children}</span>
      {onClose && <button type="button" aria-label="Cerrar aviso" onClick={onClose} style={{ width:36, height:36, border:0, background:'transparent', color:'inherit', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><Icon name="X" size={18} /></button>}
    </div>
  );
}

function PageTitle({ children, sub, right }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
      <div style={{ minWidth:0 }}>
        <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontWeight:600, fontSize:'var(--admin-title)', lineHeight:1.15, letterSpacing:'-.02em', color:'var(--admin-text)' }}>{children}</h1>
        {sub && <p style={{ ...admS.muted, margin:'4px 0 0', fontSize:14 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function SectionTitle({ children, right }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}><h2 style={{ margin:0, fontFamily:'var(--font-display)', fontWeight:600, fontSize:'var(--admin-section)', letterSpacing:'-.01em', color:'var(--admin-text)' }}>{children}</h2>{right}</div>;
}

function Empty({ children }) {
  return <p style={{ margin:0, border:'1px dashed var(--admin-border-strong)', borderRadius:'var(--admin-radius)', padding:24, textAlign:'center', ...admS.muted, fontSize:14 }}>{children}</p>;
}

function Thumb({ src, size = 48 }) {
  return src
    ? <img src={src} alt="" style={{ width:size, height:size, objectFit:'cover', borderRadius:4, flexShrink:0, display:'block', background:'var(--admin-border)' }} />
    : <span style={{ width:size, height:size, borderRadius:4, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f0f0', color:'#a3a3a3' }}><Icon name="ImageOff" size={Math.round(size * .4)} /></span>;
}

function Row({ label, value, strong, muted }) {
  return <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12, fontFamily:'var(--font-body)', fontSize:strong ? 16 : 15, fontWeight:strong ? 700 : 400, color:muted ? 'var(--admin-muted)' : 'var(--admin-text)' }}><span>{label}</span><span style={{ ...admS.mono, fontWeight:strong ? 700 : 500 }}>{value}</span></div>;
}

Object.assign(window, { admS, Icon, Btn, IconBtn, Input, TextArea, Field, SearchInput, NativeSelect, Seg, Chip, ChipRow, Card, Badge, Stepper, Sheet, Notice, PageTitle, SectionTitle, Empty, Thumb, Row });
