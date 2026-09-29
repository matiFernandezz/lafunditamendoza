const WEB_REASONS = ['No mandó el comprobante', 'Se arrepintió', 'No hay stock real'];
const webTime = (iso) => new Intl.DateTimeFormat('es-AR', { weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(new Date(iso));
const webAgo = (iso, now) => { const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000)); return m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : `hace ${Math.floor(m / 1440)} d`; };
const webUnits = (o) => o.items.reduce((s, i) => s + i.qty, 0);

function WebOrderCard({ o, now, onPaid, onCancel }) {
  const { fmt, label } = window.ADM, R = window.LF_RES;
  const ms = R.left(o, now), pending = o.status === 'pendiente', expired = pending && ms <= 0;
  const pct = Math.max(0, Math.min(1, ms / (R.CONFIG.holdHours * 3600e3)));
  const badge = o.status === 'pagada' ? <Badge kind="ok">Pagada</Badge> : o.status === 'cancelada' ? <Badge>Cancelada</Badge> : expired ? <Badge kind="danger">Vencida</Badge> : <Badge kind="warn">Pendiente de pago</Badge>;
  return (
    <Card pad={0} style={{ opacity:o.status === 'cancelada' ? .6 : 1, borderColor:expired ? 'var(--admin-danger-border)' : undefined }}>
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ minWidth:0, display:'flex', flexDirection:'column', gap:6 }}>
            <span style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}><span style={{ ...admS.mono, fontSize:15, fontWeight:700, color:'var(--admin-text)' }}>{o.id}</span>{badge}</span>
            <span style={{ ...admS.body, fontWeight:600 }}>{o.customer.name}</span>
          </div>
          <span style={{ ...admS.mono, fontSize:20, fontWeight:700, color:'var(--admin-text)', textDecoration:o.status === 'cancelada' ? 'line-through' : 'none', flexShrink:0 }}>{fmt(o.total)}</span>
        </div>
        {pending && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8, ...admS.muted }}>
              <span>Reservada {webAgo(o.createdAt, now)}</span>
              <span style={{ fontWeight:600, color:expired ? 'var(--admin-danger)' : ms < 3 * 3600e3 ? 'var(--admin-warn)' : 'var(--admin-text)' }}>{expired ? 'Venció la reserva' : 'Vence en ' + R.leftText(ms)}</span>
            </div>
            <div style={{ height:4, borderRadius:2, background:'var(--admin-border)', overflow:'hidden' }}><div style={{ height:'100%', width:pct * 100 + '%', background:expired ? 'var(--admin-danger)' : ms < 3 * 3600e3 ? 'var(--admin-warn)' : 'var(--admin-ink)' }}></div></div>
          </div>
        )}
        <ul style={{ listStyle:'none', margin:0, padding:'12px 0 0', borderTop:'1px solid var(--admin-border)', display:'flex', flexDirection:'column', gap:8 }}>
          {o.items.map((i, k) => (
            <li key={k} style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
              <span style={{ minWidth:0 }}><span style={{ display:'block', ...admS.body, fontWeight:600 }}>{i.name}</span><span style={{ display:'block', ...admS.muted }}>{label(i)} · {i.qty} × {fmt(i.price)}</span></span>
              <span style={{ ...admS.mono, fontSize:15, color:'var(--admin-text)', flexShrink:0 }}>{fmt(i.qty * i.price)}</span>
            </li>
          ))}
        </ul>
        {o.status === 'pagada' && <p style={{ margin:0, ...admS.muted }}>Pagada {webTime(o.paidAt)} · ya figura en el historial.</p>}
        {o.status === 'cancelada' && <p style={{ margin:0, ...admS.muted }}>Cancelada{o.cancelReason ? ` · ${o.cancelReason}` : ''} · el stock volvió.</p>}
        {expired && <p style={{ margin:0, ...admS.muted, color:'var(--admin-danger)' }}>Pasaron las 24 h. Si no pagó, cancelala para liberar el stock.</p>}
        <div style={{ display:'grid', gridTemplateColumns:pending ? '44px 1fr 1fr' : '1fr', gap:8 }}>
          <a href={R.customerLink(o)} target="_blank" rel="noopener" aria-label={`Escribir a ${o.customer.name} por WhatsApp`} title={o.customer.phone}
            style={{ height:'var(--admin-control-h)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, borderRadius:'var(--admin-radius)', border:'1px solid var(--admin-border-strong)', color:'var(--admin-text)', textDecoration:'none', ...admS.body, fontWeight:600 }}>
            <Icon name="MessageCircle" size={20} />{pending ? '' : `WhatsApp · ${o.customer.phone}`}
          </a>
          {pending && <Btn kind="dangerOutline" onClick={onCancel}>Cancelar</Btn>}
          {pending && <Btn icon="Check" onClick={onPaid}>Pagada</Btn>}
        </div>
      </div>
    </Card>
  );
}

function WebVentasScreen({ dk, orders, onPaid, onCancel }) {
  const { fmt } = window.ADM;
  const [f, setF] = React.useState('pendiente');
  const [pay, setPay] = React.useState(null);
  const [cancel, setCancel] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const [notice, setNotice] = React.useState(null);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const n = (s) => orders.filter((o) => o.status === s).length;
  const list = orders.filter((o) => o.status === f).sort((a, b) => f === 'pendiente' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const pendingTotal = orders.filter((o) => o.status === 'pendiente').reduce((s, o) => s + o.total, 0);
  return (
    <div style={{ maxWidth:dk ? 1040 : undefined, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>
      <PageTitle sub={n('pendiente') ? `${n('pendiente')} por cobrar · ${fmt(pendingTotal)}` : 'Reservas hechas desde la tienda. Se guardan 24 horas.'}>Ventas web</PageTitle>
      <Seg ariaLabel="Estado" value={f} onChange={setF} options={[{ value:'pendiente', label:`Pendientes (${n('pendiente')})` }, { value:'pagada', label:dk ? `Pagadas (${n('pagada')})` : 'Pagadas' }, { value:'cancelada', label:dk ? `Canceladas (${n('cancelada')})` : 'Canceladas' }]} />
      {notice && <Notice kind="ok" onClose={() => setNotice(null)}>{notice}</Notice>}
      {list.length === 0 ? <Empty>{f === 'pendiente' ? 'No hay reservas esperando pago.' : f === 'pagada' ? 'Todavía no hay ventas web pagadas.' : 'No hay reservas canceladas.'}</Empty> : (
        <div style={{ display:'grid', gridTemplateColumns:dk ? 'repeat(2, minmax(0,1fr))' : '1fr', gap:12, alignItems:'start' }}>
          {list.map((o) => <WebOrderCard key={o.id} o={o} now={now} onPaid={() => { setNotice(null); setPay(o); }} onCancel={() => { setNotice(null); setReason(R0(o, now)); setCancel(o); }} />)}
        </div>
      )}
      <Sheet open={!!pay} dk={dk} onClose={() => setPay(null)} title="Marcar como pagada">
        {pay && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <p style={{ margin:0, ...admS.body }}>¿Recibiste la transferencia de <strong>{pay.customer.name}</strong> por <strong style={admS.mono}>{fmt(pay.total)}</strong>?</p>
          <p style={{ margin:0, ...admS.muted, fontSize:14 }}>La reserva {pay.id} pasa al historial como venta por transferencia. El stock ya estaba descontado.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <Btn kind="secondary" onClick={() => setPay(null)}>Volver</Btn>
            <Btn icon="Check" onClick={() => { onPaid(pay.id); setNotice(`${pay.id} marcada como pagada · ${fmt(pay.total)} sumado al historial.`); setPay(null); }}>Sí, pagada</Btn>
          </div>
        </div>}
      </Sheet>
      <Sheet open={!!cancel} dk={dk} onClose={() => setCancel(null)} title="Cancelar reserva">
        {cancel && <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <p style={{ margin:0, ...admS.muted, fontSize:14 }}>{cancel.id} · {cancel.customer.name} · {fmt(cancel.total)}</p>
          <Field label="Motivo (opcional)">
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{WEB_REASONS.map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(reason === r ? '' : r)}>{r}</Chip>)}</div>
          </Field>
          <p style={{ margin:0, ...admS.body }}>{webUnits(cancel) === 1 ? 'Vuelve 1 unidad' : `Vuelven ${webUnits(cancel)} unidades`} al stock. ¿Confirmás?</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <Btn kind="secondary" onClick={() => setCancel(null)}>Volver</Btn>
            <Btn kind="danger" onClick={() => { const u = onCancel(cancel.id, reason); setNotice(`${cancel.id} cancelada. ${u === 1 ? 'Volvió 1 unidad' : `Volvieron ${u} unidades`} al stock.`); setCancel(null); }}>Cancelar reserva</Btn>
          </div>
        </div>}
      </Sheet>
    </div>
  );
}
const R0 = (o, now) => window.LF_RES.left(o, now) <= 0 ? WEB_REASONS[0] : '';

Object.assign(window, { WebVentasScreen });
