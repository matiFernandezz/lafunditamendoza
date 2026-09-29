const ADM_PERIODS = [{ value:'today', label:'Hoy' }, { value:'week', label:'Semana' }, { value:'month', label:'Mes' }, { value:'custom', label:'Personalizado' }];
const admDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const admAdd = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const admVal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const admParse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
function admRange(kind, from, to) {
  const t = admDay(new Date());
  if (kind === 'today') return [t, admAdd(t, 1)];
  if (kind === 'week') { const m = admAdd(t, -((t.getDay() + 6) % 7)); return [m, admAdd(m, 7)]; }
  if (kind === 'month') return [new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 1)];
  const f = admParse(from), e = admParse(to);
  return f && e && f <= e ? [f, admAdd(e, 1)] : null;
}
function admDescribe(kind, r) {
  const last = admAdd(r[1], -1);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (kind === 'month') return cap(new Intl.DateTimeFormat('es-AR', { month:'long', year:'numeric' }).format(r[0]));
  if (r[0].getTime() === last.getTime()) return cap(new Intl.DateTimeFormat('es-AR', { weekday:'long', day:'numeric', month:'long' }).format(r[0]));
  return new Intl.DateTimeFormat('es-AR', { day:'numeric', month:'long' }).formatRange(r[0], last);
}
const admTime = (iso) => new Intl.DateTimeFormat('es-AR', { hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(new Date(iso));
const admShortDay = (iso) => new Intl.DateTimeFormat('es-AR', { weekday:'short', day:'2-digit', month:'2-digit' }).format(new Date(iso));
const admUnits = (s) => s.items.reduce((a, i) => a + i.qty, 0);
const admPay = (m) => m === 'efectivo' ? 'Efectivo' : 'Transferencia';

function SummaryTile({ label, value, detail, inverse, wide, dk }) {
  return (
    <div style={{ gridColumn:wide && !dk ? 'span 2' : undefined, background:inverse ? 'var(--admin-ink)' : '#fff', color:inverse ? '#fff' : 'var(--admin-text)', border:inverse ? 0 : '1px solid var(--admin-border)', borderRadius:'var(--admin-radius)', padding:16, minWidth:0 }}>
      <p style={{ margin:0, ...admS.cap, color:inverse ? 'rgb(255 255 255 / .7)' : 'var(--admin-muted)' }}>{label}</p>
      <p style={{ margin:'6px 0 0', ...admS.mono, fontSize:inverse ? 28 : 21, fontWeight:700, lineHeight:1.1, overflowWrap:'anywhere' }}>{value}</p>
      {detail && <p style={{ margin:'6px 0 0', fontFamily:'var(--font-body)', fontSize:12, color:inverse ? 'rgb(255 255 255 / .7)' : 'var(--admin-muted)' }}>{detail}</p>}
    </div>
  );
}

function SaleRow({ s, showDay, open, onToggle, onVoid }) {
  const { fmt, label } = window.ADM;
  const voided = s.status === 'anulada';
  const units = admUnits(s);
  return (
    <li style={{ background:voided ? 'var(--admin-bg)' : '#fff', borderTop:'1px solid var(--admin-border)' }}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        style={{ width:'100%', minHeight:64, display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', border:0, background:'transparent', textAlign:'left', cursor:'pointer' }}>
        <span style={{ width:54, flexShrink:0, ...admS.mono, fontSize:14, color:voided ? 'var(--admin-muted)' : 'var(--admin-text)', paddingTop:2 }}>
          {showDay && <span style={{ display:'block', fontSize:11, textTransform:'uppercase', color:'var(--admin-muted)' }}>{admShortDay(s.date)}</span>}
          {admTime(s.date)}
        </span>
        <span style={{ flex:1, minWidth:0, opacity:voided ? .6 : 1 }}>
          <span style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
            <span style={{ ...admS.mono, fontSize:17, fontWeight:600, color:voided ? 'var(--admin-muted)' : 'var(--admin-text)', textDecoration:voided ? 'line-through' : 'none' }}>{fmt(s.total)}</span>
            {s.discountPct > 0 && <Badge kind="neutral">−{s.discountPct}%</Badge>}
            {s.channel === 'web' && <Badge kind="ink">Web {s.webId}</Badge>}
            {voided && <Badge kind="danger">Anulada</Badge>}
          </span>
          <span style={{ display:'block', marginTop:2, ...admS.muted }}>{units === 1 ? '1 producto' : `${units} productos`} · {admPay(s.method)}</span>
          {voided && s.voidReason && <span style={{ display:'block', marginTop:2, ...admS.muted }}>Motivo: {s.voidReason}</span>}
        </span>
        <span style={{ color:'var(--admin-muted)', paddingTop:2, transform:open ? 'rotate(180deg)' : 'none', transition:'transform var(--dur-fast)' }}><Icon name="ChevronDown" size={20} /></span>
      </button>
      {open && (
        <div style={{ borderTop:'1px solid var(--admin-border)', padding:'14px 16px 16px', display:'flex', flexDirection:'column', gap:14 }}>
          <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:12 }}>
            {s.items.map((i, k) => (
              <li key={k} style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', ...admS.body, fontWeight:600 }}>{i.name}</span>
                  <span style={{ display:'block', ...admS.muted }}>{label(i)}</span>
                  <span style={{ display:'block', ...admS.muted, ...admS.mono }}>{i.qty} × {fmt(i.price)}</span>
                </span>
                <span style={{ ...admS.mono, fontSize:15, fontWeight:600, color:'var(--admin-text)', flexShrink:0 }}>{fmt(i.qty * i.price)}</span>
              </li>
            ))}
          </ul>
          {s.discountPct > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6, paddingTop:12, borderTop:'1px dashed var(--admin-border-strong)' }}>
              <Row label="Subtotal" value={fmt(s.subtotal)} />
              <Row label={`Descuento ${s.discountPct}%`} value={'− ' + fmt(s.discount)} />
              <Row label="Total cobrado" value={fmt(s.total)} strong />
            </div>
          )}
          {voided
            ? <p style={{ margin:0, ...admS.muted }}>Anulada. No suma en los totales y su stock ya se devolvió.</p>
            : <div><Btn kind="dangerOutline" icon="Ban" onClick={onVoid}>Anular venta</Btn></div>}
        </div>
      )}
    </li>
  );
}

const ADM_REASONS = ['Se cargó dos veces', 'El cliente devolvió la funda', 'Error de precio'];
function VoidDialog({ dk, sale, onClose, onConfirm }) {
  const { fmt } = window.ADM;
  const [reason, setReason] = React.useState('');
  const units = sale ? admUnits(sale) : 0;
  return (
    <Sheet open={!!sale} dk={dk} onClose={onClose} title="Anular venta">
      {sale && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <p style={{ margin:0, ...admS.muted, fontSize:14 }}>{admTime(sale.date)} · {fmt(sale.total)} · {admPay(sale.method)}</p>
        <Field label="Motivo" htmlFor="void-reason">
          <TextArea id="void-reason" value={reason} onChange={setReason} placeholder="Ej.: se cargó dos veces, el cliente devolvió la funda…" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>{ADM_REASONS.map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}</div>
        </Field>
        <p style={{ margin:0, ...admS.body }}>Se van a devolver <strong>{units === 1 ? '1 unidad' : `${units} unidades`}</strong> al stock. ¿Confirmás?</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Btn kind="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn kind="danger" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>Anular venta</Btn>
        </div>
      </div>}
    </Sheet>
  );
}

function HistorialScreen({ dk, sales, onVoid }) {
  const { fmt } = window.ADM;
  const today = admVal(new Date());
  const [kind, setKind] = React.useState('today');
  const [from, setFrom] = React.useState(admVal(admAdd(new Date(), -6)));
  const [to, setTo] = React.useState(today);
  const [tab, setTab] = React.useState('ventas');
  const [openId, setOpenId] = React.useState(null);
  const [target, setTarget] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const range = admRange(kind, from, to);
  const inRange = range ? sales.filter((s) => { const d = new Date(s.date); return d >= range[0] && d < range[1]; }).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const valid = inRange.filter((s) => s.status !== 'anulada');
  const sum = (arr) => arr.reduce((a, s) => a + s.total, 0);
  const cash = valid.filter((s) => s.method === 'efectivo'), transfer = valid.filter((s) => s.method === 'transferencia');
  const total = sum(valid);
  const showDay = range && range[1] - range[0] > 25 * 3600e3;
  const top = Object.values(valid.reduce((m, s) => { s.items.forEach((i) => { const r = m[i.name] || (m[i.name] = { name:i.name, units:0, revenue:0 }); r.units += i.qty; r.revenue += Math.round(i.qty * i.price * (1 - s.discountPct / 100)); }); return m; }, {})).sort((a, b) => b.units - a.units || b.revenue - a.revenue);
  const count = (n) => n === 1 ? '1 venta' : `${n} ventas`;

  return (
    <div style={{ maxWidth:dk ? 960 : undefined, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
      <PageTitle>Historial de ventas</PageTitle>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <Seg ariaLabel="Período" options={ADM_PERIODS} value={kind} onChange={(k) => { setKind(k); setOpenId(null); }} cols={dk ? 4 : 2} />
        {kind === 'custom' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <Field label="Desde" htmlFor="h-from"><Input id="h-from" type="date" value={from} onChange={setFrom} /></Field>
            <Field label="Hasta" htmlFor="h-to"><Input id="h-to" type="date" value={to} onChange={setTo} /></Field>
            {!range && <p style={{ gridColumn:'span 2', margin:0, ...admS.muted }}>“Desde” tiene que ser igual o anterior a “Hasta”.</p>}
          </div>
        )}
        {range && <p style={{ margin:0, ...admS.body, fontWeight:600 }}>{admDescribe(kind, range)}</p>}
      </div>
      {range && <>
        <section aria-label="Resumen" style={{ display:'grid', gridTemplateColumns:dk ? 'repeat(4, minmax(0,1fr))' : 'repeat(2, minmax(0,1fr))', gap:8 }}>
          <SummaryTile dk={dk} wide inverse label="Total ingresado" value={fmt(total)} detail={valid.length ? `Ticket promedio ${fmt(Math.round(total / valid.length))}` : 'Sin ventas todavía'} />
          <SummaryTile dk={dk} label="Efectivo" value={fmt(sum(cash))} detail={count(cash.length)} />
          <SummaryTile dk={dk} label="Transferencia" value={fmt(sum(transfer))} detail={count(transfer.length)} />
          <SummaryTile dk={dk} wide label="Ventas" value={valid.length} detail="sin contar anuladas" />
        </section>
        {notice && <Notice onClose={() => setNotice(null)}>{notice}</Notice>}
        <div role="tablist" style={{ display:'flex', borderBottom:'1px solid var(--admin-border)' }}>
          {[['ventas', `Ventas (${inRange.length})`], ['top', 'Más vendidos']].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
              style={{ height:48, marginBottom:-1, padding:'0 16px', border:0, borderBottom:'2px solid ' + (tab === v ? 'var(--admin-ink)' : 'transparent'), background:'transparent', fontFamily:'var(--font-body)', fontSize:15, fontWeight:600, color:tab === v ? 'var(--admin-text)' : 'var(--admin-muted)', cursor:'pointer' }}>{l}</button>
          ))}
        </div>
        {tab === 'ventas' ? (inRange.length === 0 ? <Empty>No hubo ventas en este período.</Empty> : (
          <ul style={{ listStyle:'none', margin:0, padding:0, border:'1px solid var(--admin-border)', borderTop:0, borderRadius:'var(--admin-radius)', overflow:'hidden' }}>
            {inRange.map((s) => <SaleRow key={s.id} s={s} showDay={showDay} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} onVoid={() => { setNotice(null); setTarget(s); }} />)}
          </ul>
        )) : (top.length === 0 ? <Empty>Todavía no hay productos vendidos en este período.</Empty> : (
          <ol style={{ listStyle:'none', margin:0, padding:0, background:'#fff', border:'1px solid var(--admin-border)', borderRadius:'var(--admin-radius)' }}>
            {top.map((p, k) => (
              <li key={p.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderTop:k ? '1px solid var(--admin-border)' : 0 }}>
                <span style={{ width:28, fontFamily:'var(--font-display)', fontWeight:600, fontSize:20, color:k < 3 ? 'var(--admin-text)' : 'var(--admin-muted)' }}>{k + 1}</span>
                <span style={{ flex:1, minWidth:0, ...admS.body, fontWeight:600 }}>{p.name}</span>
                <span style={{ textAlign:'right' }}>
                  <span style={{ display:'block', ...admS.mono, fontSize:15, fontWeight:600, color:'var(--admin-text)' }}>{p.units} u.</span>
                  <span style={{ display:'block', ...admS.mono, ...admS.muted }}>{fmt(p.revenue)}</span>
                </span>
              </li>
            ))}
          </ol>
        ))}
      </>}
      <VoidDialog key={target ? target.id : 'none'} dk={dk} sale={target} onClose={() => setTarget(null)}
        onConfirm={(reason) => { const u = onVoid(target.id, reason); setTarget(null); setNotice(`Venta anulada. ${u === 1 ? 'Se devolvió 1 unidad' : `Se devolvieron ${u} unidades`} al stock.`); }} />
    </div>
  );
}

Object.assign(window, { HistorialScreen });
