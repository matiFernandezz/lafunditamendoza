import React from 'react';
import { Chip } from '../core/Chip.jsx';
/** Franja "Elegí tu iPhone": números grandes por línea (11…17, Air) que despliegan sub-modelos. */
export function ModelStrip({ lines = [], onSelectModel, label = 'Elegí tu iPhone' }) {
  const [open, setOpen] = React.useState(null);
  const pad = '0 var(--page-pad)';
  return (
    <div style={{ borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px var(--page-pad)', fontFamily:'var(--font-body)',fontSize:'var(--text-xs)',fontWeight:600,letterSpacing:'var(--tracking-label)',textTransform:'uppercase', fontSize: 'var(--text-small)', color: 'var(--graphite)' }}>
        <span>{label}</span><span aria-hidden="true" style={{ textTransform: 'none' }}>→</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))', justifyItems: 'center', columnGap: 8, rowGap: 20, padding: '4px var(--page-pad) 24px' }}>
        {lines.map((l) => <LineButton key={l.label} line={l} open={open === l.label}
          onClick={() => l.models && l.models.length > 1 ? setOpen(open === l.label ? null : l.label) : onSelectModel && onSelectModel(l.models ? l.models[0] : { name: l.label })} />)}
      </div>
      {lines.map((l) => l.models && l.models.length > 1 && open === l.label ? (
        <div key={l.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--rule)', padding: '16px var(--page-pad)' }}>
          {l.models.map((m) => <Chip key={m.name} size="sm" href={m.href || '#'} onClick={(e) => { if (onSelectModel) { e.preventDefault(); onSelectModel(m); } }}>{m.name}</Chip>)}
        </div>
      ) : null)}
    </div>
  );
}
function LineButton({ line, open, onClick }) {
  const [h, setH] = React.useState(false);
  const single = !line.models || line.models.length === 1;
  return (
    <button type="button" onClick={onClick} aria-expanded={single ? undefined : open} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink)', minWidth: 44 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-model)', fontWeight: 600, lineHeight: 1.1, letterSpacing: 'var(--tracking-tight)', opacity: h && !open ? .6 : 1, transition: 'opacity var(--dur-fast)', borderBottom: open ? '2px solid var(--ink)' : '2px solid transparent' }}>{line.label}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--graphite)' }}>{single && line.models ? line.models[0].name : 'iPhone ' + line.label}</span>
    </button>
  );
}
