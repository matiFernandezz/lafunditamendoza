import React from 'react';
import { ArrowMark } from '../brand/ArrowMark.jsx';
const KF = '@keyframes lf-rise{from{transform:translateY(105%)}to{transform:translateY(0)}}@keyframes lf-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@media (prefers-reduced-motion:reduce){.lf-rise,.lf-draw path{animation:none!important}}';
/** Hero tipográfico firma: "iPhone 11 →" / "17 Pro Max" en Space Grotesk, con subida enmascarada. */
export function RangeHero({ from = 'iPhone 11', to = '18 Pro Max', lead, animate = true, tone = 'ink' }) {
  const c = tone === 'paper' ? 'var(--paper)' : 'var(--ink)';
  const line = (d) => ({ display: 'block', animation: animate ? 'lf-rise var(--dur-hero) var(--ease-out) ' + d + 'ms both' : 'none' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{KF}</style>
      <h1 aria-label={from + ' a ' + to} style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-hero)', fontWeight: 600, lineHeight: 'var(--leading-hero)', letterSpacing: 'var(--tracking-hero)', color: c }}>
        <span style={{ display: 'block', overflow: 'hidden', padding: '.1em 0', margin: '-.1em 0' }}>
          <span className="lf-rise" style={{ ...line(0), display: 'flex', alignItems: 'center', gap: '.2em', whiteSpace: 'nowrap' }}>{from}
            <span className="lf-draw" style={{ display: 'inline-flex' }}><svg viewBox="0 0 64 40" style={{ width: '.9em', height: '.56em' }} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true"><path pathLength={1} d="M4 20H58M42 4L58 20L42 36" style={{ strokeDasharray: 1, animation: animate ? 'lf-draw var(--dur-draw) var(--ease-out) 300ms both' : 'none' }} /></svg></span>
          </span>
        </span>
        <span style={{ display: 'block', overflow: 'hidden', padding: '.1em 0', margin: '-.1em 0' }}><span className="lf-rise" style={{ ...line(90), whiteSpace: 'nowrap' }}>{to}</span></span>
      </h1>
      {lead && <p style={{ margin: 0, maxWidth: 'var(--measure-lead)', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 'var(--text-lead)', lineHeight: 'var(--leading-body)', color: tone === 'paper' ? 'var(--paper-85)' : 'var(--graphite)' }}>{lead}</p>}
    </div>
  );
}
