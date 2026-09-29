import React from 'react';
/** Título de sección editorial: etiqueta opcional en mayúsculas + h2 en Space Grotesk. */
export function SectionHeading({ label, title, size = 'section', tone = 'ink', action }) {
  const inv = tone === 'paper';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        {label && <p style={{ margin: '0 0 4px', fontFamily:'var(--font-body)',fontSize:'var(--text-xs)',fontWeight:600,letterSpacing:'var(--tracking-label)',textTransform:'uppercase', color: inv ? 'var(--paper-70)' : 'var(--graphite)' }}>{label}</p>}
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: size === 'headline' ? 'var(--text-headline)' : 'var(--text-section)', fontWeight: 600, lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--tracking-tight)', color: inv ? 'var(--paper)' : 'var(--ink)' }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
