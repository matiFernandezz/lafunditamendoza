import React from 'react';
import { BackLink } from './BackLink.jsx';
/** Encabezado de página interior: BackLink + h1 display + conteo en grafito. */
export function PageHeader({ title, parent, count, countSuffix, backHref = '#', backLabel = 'Inicio', onBack, showBack = true }) {
  const countText = typeof count === 'number' ? (count === 1 ? '1 producto' : count + ' productos') : count;
  return (
    <div>
      {showBack && <BackLink href={backHref} onClick={onBack}>{backLabel}</BackLink>}
      <h1 style={{ margin: showBack ? '12px 0 0' : 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-page)', fontWeight: 600, lineHeight: 'var(--leading-page)', letterSpacing: 'var(--tracking-page)', color: 'var(--ink)' }}>
        {parent && <span style={{ color: 'var(--graphite)' }}>{parent} / </span>}{title}
      </h1>
      {countText != null && <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-body)', color: 'var(--graphite)', fontVariantNumeric: 'tabular-nums' }}>{countText}{countSuffix && <span> {countSuffix}</span>}</p>}
    </div>
  );
}
