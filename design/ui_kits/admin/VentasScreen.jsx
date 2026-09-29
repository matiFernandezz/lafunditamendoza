const ADM_DISCOUNTS = [{ value:'0', label:'Sin' }, { value:'10', label:'10%' }, { value:'15', label:'15%' }, { value:'20', label:'20%' }, { value:'otro', label:'Otro' }];
const ADM_PAY = [{ value:'efectivo', label:'Efectivo', icon:'Banknote' }, { value:'transferencia', label:'Transferencia', icon:'Landmark' }];

function SellCard({ p, variants, inCart, onAdd }) {
  const { fmt, label } = window.ADM;
  return (
    <Card pad={0}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
        <Thumb src={p.images[0]} size={44} />
        <div style={{ minWidth:0 }}>
          <p style={{ margin:0, ...admS.body, fontSize:16, fontWeight:600 }}>{p.name}</p>
          <p style={{ margin:0, ...admS.muted }}>{p.category}</p>
        </div>
      </div>
      {variants.map((v) => {
        const n = inCart(v.id); const out = v.stock <= 0; const limit = !out && n >= v.stock;
        return (
          <button key={v.id} type="button" disabled={out || limit} onClick={() => onAdd(p, v)}
            style={{ width:'100%', minHeight:60, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'8px 12px 8px 16px', border:0, borderTop:'1px solid var(--admin-border)', background:n ? '#f5f5f5' : '#fff', textAlign:'left', cursor:out || limit ? 'default' : 'pointer' }}>
            <span style={{ minWidth:0, opacity:out ? .45 : 1 }}>
              <span style={{ display:'block', ...admS.body, fontWeight:500 }}>{label(v)}</span>
              <span style={{ display:'flex', gap:6, ...admS.muted, marginTop:2 }}>
                {out ? <span style={{ color:'var(--admin-danger)', fontWeight:600 }}>Sin stock</span>
                  : v.stock <= 3 ? <span style={{ color:'var(--admin-warn)', fontWeight:600 }}>Quedan {v.stock}</span>
                  : <span>Stock {v.stock}</span>}
                {n > 0 && <span style={{ color:'var(--admin-text)', fontWeight:600 }}>· {n} en la venta</span>}
              </span>
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
              <span style={{ ...admS.mono, fontSize:15, fontWeight:600, color:'var(--admin-text)', opacity:out ? .45 : 1 }}>{fmt(v.price)}</span>
              <span aria-hidden="true" style={{ width:40, height:40, borderRadius:9999, display:'flex', alignItems:'center', justifyContent:'center', background:out || limit ? 'var(--admin-disabled-bg)' : 'var(--admin-ink)', color:out || limit ? 'var(--admin-disabled-fg)' : '#fff' }}><Icon name="Plus" size={20} stroke={2.2} /></span>
            </span>
          </button>
        );
      })}
    </Card>
  );
}

function CartPanel({ items, setQty, disc, setDisc, other, setOther, method, setMethod, subtotal, pct, discount, total, onConfirm, heading }) {
  const { fmt, label } = window.ADM;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {heading}
      {items.length === 0 ? (
        <p style={{ margin:'8px 0', textAlign:'center', ...admS.muted, fontSize:14 }}>Todavía no agregaste productos. Tocá un modelo para sumarlo.</p>
      ) : (
        <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column' }}>
          {items.map((i, k) => (
            <li key={i.vid} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:k ? '1px solid var(--admin-border)' : 0 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, ...admS.body, fontWeight:600 }}>{i.name}</p>
                <p style={{ margin:'2px 0 0', ...admS.muted }}>{label(i)}</p>
                <p style={{ margin:'4px 0 0', ...admS.mono, fontSize:14, color:'var(--admin-text)' }}>{fmt(i.price)}</p>
              </div>
              <Stepper value={i.qty} min={0} max={i.stock} onChange={(q) => setQty(i.vid, q)} />
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && <>
        <div>
          <p style={admS.label}>Descuento</p>
          <Seg ariaLabel="Descuento" options={ADM_DISCOUNTS} value={disc} onChange={setDisc} />
          {disc === 'otro' && <div style={{ marginTop:8 }}><Input value={other} onChange={setOther} digits suffix="%" placeholder="Escribí el porcentaje" autoFocus mono ariaLabel="Otro porcentaje" /></div>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, padding:16, background:'var(--admin-bg)', borderRadius:'var(--admin-radius)', border:'1px solid var(--admin-border)' }}>
          <Row label="Subtotal" value={fmt(subtotal)} />
          <Row label={pct > 0 ? `Descuento ${pct}%` : 'Descuento'} value={pct > 0 ? '− ' + fmt(discount) : '—'} muted={!pct} />
          <div style={{ borderTop:'1px solid var(--admin-border)', margin:'4px 0' }}></div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12 }}>
            <span style={admS.cap}>Total a cobrar</span>
            <span style={{ ...admS.mono, fontSize:'var(--admin-total)', fontWeight:700, color:'var(--admin-text)', lineHeight:1 }}>{fmt(total)}</span>
          </div>
        </div>
        <div>
          <p style={admS.label}>Medio de pago</p>
          <Seg ariaLabel="Medio de pago" options={ADM_PAY} value={method} onChange={setMethod} h="var(--admin-cta-h)" />
        </div>
        <Btn size="lg" full onClick={onConfirm} icon="Check">Cobrar {fmt(total)}</Btn>
      </>}
    </div>
  );
}

function VentasScreen({ dk, products, onConfirm }) {
  const { LINES, fmt, matches, lineOf } = window.ADM;
  const [q, setQ] = React.useState('');
  const [line, setLine] = React.useState('');
  const [cart, setCart] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [disc, setDisc] = React.useState('0');
  const [other, setOther] = React.useState('');
  const [method, setMethod] = React.useState('efectivo');
  const [done, setDone] = React.useState(null);

  const results = products.map((p) => ({ p, variants:p.variants.filter((v) => matches(p, v, q) && (!line || lineOf(v.model) === line)) })).filter((r) => r.variants.length);
  const inCart = (vid) => (cart.find((i) => i.vid === vid) || {}).qty || 0;
  const add = (p, v) => setCart((c) => {
    const e = c.find((i) => i.vid === v.id);
    if (e) return e.qty >= v.stock ? c : c.map((i) => i.vid === v.id ? { ...i, qty:i.qty + 1 } : i);
    return v.stock < 1 ? c : [...c, { pid:p.id, vid:v.id, name:p.name, model:v.model, color:v.color, price:v.price, qty:1, stock:v.stock }];
  });
  const setQty = (vid, qty) => setCart((c) => qty <= 0 ? c.filter((i) => i.vid !== vid) : c.map((i) => i.vid === vid ? { ...i, qty } : i));
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const pct = disc === 'otro' ? Math.min(100, Number(other) || 0) : Number(disc);
  const discount = Math.round(subtotal * pct / 100);
  const total = subtotal - discount;
  const confirm = () => {
    const sale = onConfirm({ items:cart, subtotal, discountPct:pct, discount, total, method });
    setDone(sale); setCart([]); setOpen(false); setDisc('0'); setOther(''); setMethod('efectivo');
  };
  const panelProps = { items:cart, setQty, disc, setDisc, other, setOther, method, setMethod, subtotal, pct, discount, total, onConfirm:confirm };

  const search = (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <SearchInput value={q} onChange={setQ} placeholder="Buscar producto o modelo… ej. cherry 15 pro" />
      <ChipRow wrap={dk} value={line} onChange={setLine} options={[{ value:'', label:'Todos' }, ...LINES.map((l) => ({ value:l[0], label:'iPhone ' + l[0] }))]} />
    </div>
  );
  const list = results.length === 0 ? <Empty>No encontramos productos con esa búsqueda.</Empty> : (
    <div style={{ display:'grid', gridTemplateColumns:dk ? 'repeat(2, minmax(0,1fr))' : '1fr', gap:12, alignItems:'start' }}>
      {results.map(({ p, variants }) => <SellCard key={p.id} p={p} variants={variants} inCart={inCart} onAdd={add} />)}
    </div>
  );

  return (
    <>
      {dk ? (
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 400px', gap:24, alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:20, minWidth:0 }}><PageTitle sub="Tocá un modelo para sumarlo a la venta.">Nueva venta</PageTitle>{search}{list}</div>
          <aside style={{ position:'sticky', top:88 }}><Card pad={20}><CartPanel {...panelProps} heading={<SectionTitle right={count ? <span style={admS.muted}>{count} {count === 1 ? 'producto' : 'productos'}</span> : null}>Venta actual</SectionTitle>} /></Card></aside>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16, paddingBottom:count ? 72 : 0 }}><PageTitle>Nueva venta</PageTitle>{search}{list}</div>
      )}
      {!dk && count > 0 && !open && (
        <button type="button" onClick={() => setOpen(true)}
          style={{ position:'fixed', zIndex:35, bottom:'calc(var(--admin-nav-h) + 12px)', left:'50%', transform:'translateX(-50%)', width:'calc(min(100%, 430px) - 32px)', height:60, borderRadius:'var(--admin-radius)', border:0, background:'var(--admin-ink)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px 0 18px', cursor:'pointer', fontFamily:'var(--font-body)', boxShadow:'0 8px 24px rgb(0 0 0 / .18)' }}>
          <span style={{ display:'flex', alignItems:'center', gap:10, fontSize:15, fontWeight:600 }}>
            <span style={{ minWidth:26, height:26, borderRadius:13, background:'#fff', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', ...admS.mono, fontSize:14, fontWeight:700 }}>{count}</span>Ver venta
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:6, ...admS.mono, fontSize:18, fontWeight:700 }}>{fmt(total)}<Icon name="ChevronUp" size={20} /></span>
        </button>
      )}
      {!dk && <Sheet open={open} onClose={() => setOpen(false)} title="Venta actual"><CartPanel {...panelProps} /></Sheet>}
      <Sheet open={!!done} center dk={dk} onClose={() => setDone(null)} width={400}>
        {done && <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, textAlign:'center', paddingTop:12 }}>
          <span style={{ color:'var(--admin-ok)' }}><Icon name="CircleCheck" size={48} stroke={1.5} /></span>
          <h2 style={{ margin:'8px 0 0', fontFamily:'var(--font-display)', fontWeight:600, fontSize:22, color:'var(--admin-text)' }}>Venta registrada</h2>
          <p style={{ margin:'8px 0 0', ...admS.cap }}>Total cobrado</p>
          <p style={{ margin:0, ...admS.mono, fontSize:36, fontWeight:700, color:'var(--admin-text)' }}>{fmt(done.total)}</p>
          <p style={{ margin:0, ...admS.muted, fontSize:14 }}>{done.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}{done.discountPct ? ` · ${done.discountPct}% de descuento (− ${fmt(done.discount)})` : ''}</p>
          <Btn size="lg" full style={{ marginTop:20 }} onClick={() => setDone(null)}>Nueva venta</Btn>
        </div>}
      </Sheet>
    </>
  );
}

Object.assign(window, { VentasScreen });
