import React from 'react';
const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
/** Precio grande en mono + stock + SKU, separado por regla arriba. */
export function PriceBlock({ price, stock, sku, lowStock = 3, divider = true }) {
  const p = typeof price === 'number' ? fmt.format(price) : price;
  const st = stock == null ? null : stock <= lowStock ? (stock === 1 ? 'Última unidad' : 'Quedan ' + stock) : 'En stock';
  const low = stock != null && stock <= lowStock;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: divider ? '1px solid var(--rule)' : 'none', paddingTop: divider ? 24 : 0 }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-price-lg)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>{p}</p>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 'var(--text-small)', color: 'var(--graphite)' }}>
        {low && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--ink)' }}></span>}
        {st && <span style={{ color: low ? 'var(--ink)' : undefined, fontWeight: low ? 500 : 400 }}>{st}</span>}
        {st && sku && <span aria-hidden="true">·</span>}
        {sku && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{sku}</span>}
      </p>
    </div>
  );
}
