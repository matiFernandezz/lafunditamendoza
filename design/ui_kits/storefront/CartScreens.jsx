const cartFmt = (x) => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(x || 0);
const cartCap = { fontFamily:'var(--font-body)', fontSize:13, fontWeight:500, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--graphite)' };
const cartBody = { fontFamily:'var(--font-body)', fontSize:16, lineHeight:1.5, color:'var(--ink)' };
const cartH1 = { margin:0, fontFamily:'var(--font-display)', fontWeight:600, fontSize:'var(--text-section)', lineHeight:1.05, letterSpacing:'var(--tracking-tight)', color:'var(--ink)', textWrap:'pretty' };
const cartWrap = (dk) => ({ maxWidth:dk ? 760 : undefined, margin:'0 auto', display:'flex', flexDirection:'column', gap:32, padding:dk ? '48px var(--page-pad) var(--main-bottom)' : '24px var(--page-pad) var(--main-bottom)' });
const cartVariant = (i) => [i.model, i.color].filter(Boolean).join(' · ');

function useNow(ms) {
  const [n, setN] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setN(Date.now()), ms || 30000); return () => clearInterval(t); }, [ms]);
  return n;
}

function QtyControl({ value, onChange, max }) {
  const b = (dis) => ({ width:44, height:44, borderRadius:9999, border:'1px solid var(--rule)', background:'transparent', color:'var(--ink)', fontFamily:'var(--font-mono)', fontSize:20, lineHeight:1, cursor:dis ? 'default' : 'pointer', opacity:dis ? .3 : 1, display:'flex', alignItems:'center', justifyContent:'center', padding:0 });
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <button type="button" aria-label="Restar uno" style={b(value <= 1)} disabled={value <= 1} onClick={() => onChange(value - 1)}>−</button>
      <span style={{ minWidth:28, textAlign:'center', fontFamily:'var(--font-mono)', fontSize:16, fontVariantNumeric:'tabular-nums' }}>{value}</span>
      <button type="button" aria-label="Sumar uno" style={b(value >= max)} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function StoreField({ label, id, value, onChange, placeholder, type = 'text', inputMode, hint }) {
  const [f, setF] = React.useState(false);
  return (
    <div>
      <label htmlFor={id} style={{ display:'block', marginBottom:8, fontFamily:'var(--font-body)', fontWeight:500, color:'var(--ink)' }}>{label}</label>
      <input id={id} type={type} inputMode={inputMode} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{ width:'100%', height:56, boxSizing:'border-box', padding:'0 16px', borderRadius:8, border:'1px solid ' + (f ? 'var(--ink)' : 'var(--rule)'), background:'#fff', fontFamily:'var(--font-body)', fontSize:16, color:'var(--ink)', outline:'none' }} />
      {hint && <p style={{ margin:'6px 0 0', fontFamily:'var(--font-body)', fontSize:14, color:'var(--graphite)' }}>{hint}</p>}
    </div>
  );
}

function CartScreen({ cart, go }) {
  const LF = window.LaFunditaDesignSystem_371b6e, dk = !!window.LF_DESKTOP;
  const n = cart.count;
  return (
    <div style={cartWrap(dk)}>
      <LF.PageHeader title="Carrito" count={n === 1 ? '1 producto' : `${n} productos`} backLabel="Seguir comprando" onBack={(e) => { e.preventDefault(); go({ screen:'home' }); }} />
      {n === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:20, alignItems:'flex-start' }}>
          <p style={{ ...cartBody, margin:0, color:'var(--graphite)' }}>Tu carrito está vacío.</p>
          <LF.Button onClick={() => go({ screen:'category', slug:'de-diseno' })}>Ver fundas</LF.Button>
        </div>
      ) : <>
        <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column' }}>
          {cart.items.map((i, k) => (
            <li key={i.key} style={{ display:'grid', gridTemplateColumns:'88px minmax(0,1fr)', gap:16, padding:'20px 0', borderTop:k ? '1px solid var(--rule)' : 0 }}>
              {i.image ? <img src={i.image} alt="" style={{ width:88, aspectRatio:'4/5', objectFit:'cover', display:'block' }} /> : <span style={{ width:88, aspectRatio:'4/5', background:'var(--surface-photo-empty, #ecebe7)', display:'block' }}></span>}
              <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:0 }}>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:19, letterSpacing:'-.01em', color:'var(--ink)' }}>{i.name}</span>
                <span style={{ fontFamily:'var(--font-body)', fontSize:15, color:'var(--graphite)' }}>{cartVariant(i)}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:15, color:'var(--ink)' }}>{cartFmt(i.price)}</span>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginTop:4 }}>
                  <QtyControl value={i.qty} max={i.max || 99} onChange={(q) => cart.setQty(i.key, q)} />
                  <button type="button" onClick={() => cart.remove(i.key)} style={{ minHeight:44, border:0, background:'transparent', padding:0, fontFamily:'var(--font-body)', fontSize:15, color:'var(--graphite)', textDecoration:'underline', textUnderlineOffset:3, cursor:'pointer' }}>Quitar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div style={{ borderTop:'1px solid var(--ink)', paddingTop:20, display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12 }}>
            <span style={cartCap}>Total</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:32, fontWeight:500, color:'var(--ink)' }}>{cartFmt(cart.total)}</span>
          </div>
          <p style={{ ...cartBody, margin:0, fontSize:15, color:'var(--graphite)' }}>Pagás por transferencia. Al comprar te reservamos las fundas por 24 horas.</p>
          <LF.Button fullWidth onClick={() => go({ screen:'checkout' })}>Comprar</LF.Button>
        </div>
      </>}
    </div>
  );
}

function CheckoutScreen({ cart, go }) {
  const LF = window.LaFunditaDesignSystem_371b6e, dk = !!window.LF_DESKTOP;
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const ok = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 8;
  if (!cart.count) return <CartScreen cart={cart} go={go} />;
  const submit = () => {
    const o = window.LF_RES.create({ customer:{ name:name.trim(), phone:phone.trim() }, items:cart.items.map(({ name, model, color, qty, price }) => ({ name, model, color, qty, price })) });
    cart.clear(); go({ screen:'reserva', id:o.id });
  };
  return (
    <div style={cartWrap(dk)}>
      <LF.PageHeader title="Finalizar compra" backLabel="Carrito" onBack={(e) => { e.preventDefault(); go({ screen:'cart' }); }} />
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <StoreField id="co-name" label="Tu nombre" value={name} onChange={setName} placeholder="Nombre y apellido" />
        <StoreField id="co-phone" label="Tu WhatsApp" value={phone} onChange={setPhone} type="tel" inputMode="tel" placeholder="261 555 1234" hint="Te escribimos por acá para confirmar el pago y coordinar la entrega." />
      </div>
      <div style={{ borderTop:'1px solid var(--rule)', paddingTop:20, display:'flex', flexDirection:'column', gap:12 }}>
        {cart.items.map((i) => (
          <div key={i.key} style={{ display:'flex', justifyContent:'space-between', gap:12, fontFamily:'var(--font-body)', fontSize:15, color:'var(--ink)' }}>
            <span style={{ minWidth:0 }}>{i.name} <span style={{ color:'var(--graphite)' }}>· {cartVariant(i)} ×{i.qty}</span></span>
            <span style={{ fontFamily:'var(--font-mono)', flexShrink:0 }}>{cartFmt(i.qty * i.price)}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12, borderTop:'1px solid var(--ink)', paddingTop:16, marginTop:4 }}>
          <span style={cartCap}>Total</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:500, color:'var(--ink)' }}>{cartFmt(cart.total)}</span>
        </div>
      </div>
      <LF.Button fullWidth disabled={!ok} onClick={submit}>Reservar y ver datos de pago</LF.Button>
    </div>
  );
}

function CopyRow({ label, value }) {
  const [done, setDone] = React.useState(false);
  const copy = () => { try { navigator.clipboard && navigator.clipboard.writeText(value); } catch (e) {} setDone(true); setTimeout(() => setDone(false), 1600); };
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'16px 0', borderTop:'1px solid var(--rule)' }}>
      <div style={{ minWidth:0 }}>
        <span style={{ ...cartCap, display:'block', marginBottom:4 }}>{label}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:label === 'CBU' ? 15 : 20, color:'var(--ink)', overflowWrap:'anywhere' }}>{value}</span>
      </div>
      <button type="button" onClick={copy} style={{ flexShrink:0, height:44, padding:'0 18px', borderRadius:9999, border:'1px solid ' + (done ? 'var(--ink)' : 'var(--rule)'), background:done ? 'var(--ink)' : 'transparent', color:done ? 'var(--paper)' : 'var(--ink)', fontFamily:'var(--font-body)', fontSize:15, fontWeight:500, cursor:'pointer' }}>{done ? 'Copiado' : 'Copiar'}</button>
    </div>
  );
}

function ReservaScreen({ id, go }) {
  const LF = window.LaFunditaDesignSystem_371b6e, R = window.LF_RES, C = R.CONFIG, dk = !!window.LF_DESKTOP;
  const now = useNow(30000);
  const [o, setO] = React.useState(() => R.get(id));
  React.useEffect(() => R.subscribe(() => setO(R.get(id))), [id]);
  if (!o) return <div style={cartWrap(dk)}><p style={cartBody}>No encontramos esa reserva.</p><LF.Button onClick={() => go({ screen:'home' })}>Volver a la tienda</LF.Button></div>;
  const ms = R.left(o, now), expired = o.status === 'pendiente' && ms <= 0;
  const state = o.status === 'pagada' ? ['¡Pago confirmado!', 'Ya recibimos tu transferencia. Te escribimos por WhatsApp para coordinar la entrega.']
    : o.status === 'cancelada' ? ['Esta reserva se canceló', 'Las fundas volvieron a estar disponibles. Si querés, armá un carrito nuevo.']
    : expired ? ['La reserva venció', 'Pasaron las 24 horas. Escribinos por WhatsApp y vemos si todavía hay stock.'] : null;
  return (
    <div style={cartWrap(dk)}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <span style={cartCap}>Reserva {o.id}</span>
        <h1 style={cartH1}>{state ? state[0] : 'Transferí y mandanos el comprobante'}</h1>
        {state && <p style={{ ...cartBody, margin:0, color:'var(--graphite)' }}>{state[1]}</p>}
      </div>
      {!state && (
        <div style={{ background:'var(--ink)', color:'var(--paper)', padding:'20px var(--page-pad)', margin:dk ? 0 : '0 calc(var(--page-pad) * -1)', display:'flex', flexDirection:'column', gap:4 }}>
          <span style={{ fontFamily:'var(--font-body)', fontSize:15 }}>Te guardamos tus fundas por 24 horas.</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:22 }}>Quedan {R.leftText(ms)}</span>
        </div>
      )}
      {o.status === 'pendiente' && <>
        <div>
          <span style={{ ...cartCap, display:'block', marginBottom:6 }}>Total a transferir</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:44, fontWeight:500, lineHeight:1, color:'var(--ink)' }}>{cartFmt(o.total)}</span>
        </div>
        <div style={{ borderBottom:'1px solid var(--rule)' }}>
          <CopyRow label="Alias" value={C.alias} />
          <CopyRow label="CBU" value={C.cbu} />
          <p style={{ margin:0, padding:'12px 0 16px', fontFamily:'var(--font-body)', fontSize:14, color:'var(--graphite)' }}>Titular: {C.titular} · {C.banco}{C.test ? ' · datos de prueba' : ''}</p>
        </div>
        <ol style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:12, counterReset:'st' }}>
          {['Transferí el total al alias o al CBU.', 'Mandanos el comprobante por WhatsApp.', 'Te confirmamos el pago y coordinamos la entrega.'].map((t, k) => (
            <li key={k} style={{ display:'flex', gap:14, alignItems:'baseline', ...cartBody, fontSize:15 }}><span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:20, width:18 }}>{k + 1}</span>{t}</li>
          ))}
        </ol>
      </>}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {o.status !== 'cancelada' && <LF.Button fullWidth onClick={() => window.open(R.waLink(o), '_blank', 'noopener')}>{o.status === 'pendiente' && !expired ? 'Mandar comprobante a WhatsApp' : 'Escribirnos por WhatsApp'}</LF.Button>}
        <button type="button" onClick={() => go({ screen:'home' })} style={{ minHeight:48, border:0, background:'transparent', fontFamily:'var(--font-body)', fontSize:15, color:'var(--ink)', textDecoration:'underline', textUnderlineOffset:3, cursor:'pointer' }}>Volver a la tienda</button>
      </div>
      <div style={{ borderTop:'1px solid var(--rule)', paddingTop:16, display:'flex', flexDirection:'column', gap:8 }}>
        <span style={cartCap}>Tu pedido</span>
        {o.items.map((i, k) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:12, fontFamily:'var(--font-body)', fontSize:15, color:'var(--ink)' }}>
            <span>{i.name} <span style={{ color:'var(--graphite)' }}>· {cartVariant(i)} ×{i.qty}</span></span><span style={{ fontFamily:'var(--font-mono)' }}>{cartFmt(i.qty * i.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartBar({ cart, go }) {
  const dk = !!window.LF_DESKTOP;
  if (!cart.count) return null;
  return (
    <button type="button" onClick={() => go({ screen:'cart' })}
      style={{ position:'fixed', zIndex:40, bottom:16, ...(dk ? { right:32, width:360 } : { left:'50%', transform:'translateX(-50%)', width:'calc(min(100%, 430px) - 32px)' }), height:60, borderRadius:9999, border:0, background:'var(--ink)', color:'var(--paper)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', cursor:'pointer', boxShadow:'0 10px 30px rgb(0 0 0 / .22)' }}>
      <span style={{ fontFamily:'var(--font-body)', fontSize:16, fontWeight:500 }}>Ver carrito ({cart.count})</span>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:17 }}>{cartFmt(cart.total)}</span>
    </button>
  );
}

function useCart() {
  const [items, setItems] = React.useState(() => { try { return JSON.parse(localStorage.getItem('lf-cart')) || []; } catch (e) { return []; } });
  const put = (fn) => setItems((prev) => { const n = fn(prev); localStorage.setItem('lf-cart', JSON.stringify(n)); return n; });
  return {
    items,
    count:items.reduce((s, i) => s + i.qty, 0),
    total:items.reduce((s, i) => s + i.qty * i.price, 0),
    add:(it) => put((c) => c.some((i) => i.key === it.key) ? c.map((i) => i.key === it.key ? { ...i, qty:Math.min(i.max || 99, i.qty + 1) } : i) : [...c, it]),
    setQty:(key, qty) => put((c) => c.map((i) => i.key === key ? { ...i, qty } : i)),
    remove:(key) => put((c) => c.filter((i) => i.key !== key)),
    clear:() => put(() => []),
  };
}

Object.assign(window, { CartScreen, CheckoutScreen, ReservaScreen, CartBar, useCart });
