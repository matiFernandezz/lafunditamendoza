const admSame = (a, b) => (a || null) === (b || null);
function admApplyWeb(products, items, sign) {
  return products.map((p) => { const its = items.filter((i) => i.name === p.name); if (!its.length) return p;
    return { ...p, variants:p.variants.map((v) => { const d = its.filter((i) => admSame(i.model, v.model) && admSame(i.color, v.color)).reduce((s, i) => s + i.qty, 0); return d ? { ...v, stock:Math.max(0, v.stock + sign * d) } : v; }) }; });
}
function admWebSale(o, products, at) {
  return { id:'sw' + o.id, date:at || o.paidAt || new Date().toISOString(), status:'ok', voidReason:null, method:'transferencia', channel:'web', webId:o.id, discountPct:0, subtotal:o.total, discount:0, total:o.total,
    items:o.items.map((i) => { const p = products.find((x) => x.name === i.name); const v = p && p.variants.find((y) => admSame(y.model, i.model) && admSame(y.color, i.color)); return { ...i, pid:p ? p.id : null, vid:v ? v.id : null }; }) };
}
function AdminApp() {
  const dk = !!window.ADM_DESKTOP;
  const K = dk ? '-dk' : '';
  const D = window.ADM_DATA;
  const [authed, setAuthed] = React.useState(() => localStorage.getItem('lf-adm-auth' + K) === '1');
  const [tab, setTabS] = React.useState(() => localStorage.getItem('lf-adm-tab' + K) || 'ventas');
  const R = window.LF_RES;
  const [web, setWeb] = React.useState(() => R.all());
  const [products, setProducts] = React.useState(() => admApplyWeb(D.products, web.filter((o) => o.status !== 'cancelada').flatMap((o) => o.items), -1));
  const [sales, setSales] = React.useState(() => [...D.sales, ...web.filter((o) => o.status === 'pagada').map((o) => admWebSale(o, D.products))]);
  const seen = React.useRef(new Set(web.map((o) => o.id)));
  React.useEffect(() => R.subscribe((list) => {
    const fresh = list.filter((o) => !seen.current.has(o.id));
    fresh.forEach((o) => seen.current.add(o.id));
    if (fresh.length) setProducts((ps) => admApplyWeb(ps, fresh.flatMap((o) => o.items), -1));
    setWeb(list);
  }), []);
  const markPaid = (id) => {
    const at = new Date().toISOString(); const o = web.find((x) => x.id === id);
    R.save(R.all().map((x) => x.id === id ? { ...x, status:'pagada', paidAt:at } : x));
    setSales((x) => [admWebSale({ ...o, paidAt:at }, products, at), ...x]);
  };
  const cancelWeb = (id, reason) => {
    const o = web.find((x) => x.id === id);
    R.save(R.all().map((x) => x.id === id ? { ...x, status:'cancelada', cancelledAt:new Date().toISOString(), cancelReason:reason } : x));
    setProducts((ps) => admApplyWeb(ps, o.items, 1));
    return o.items.reduce((s, i) => s + i.qty, 0);
  };
  const [suppliers, setSuppliers] = React.useState(D.suppliers);
  const [focus, setFocus] = React.useState(null);
  const [catNotice, setCatNotice] = React.useState(null);
  const setTab = (t) => { setTabS(t); localStorage.setItem('lf-adm-tab' + K, t); window.scrollTo(0, 0); };
  const bump = (changes) => setProducts((ps) => ps.map((p) => ({ ...p, variants:p.variants.map((v) => { const d = changes.filter((c) => c.vid === v.id).reduce((s, c) => s + c.delta, 0); return d ? { ...v, stock:Math.max(0, v.stock + d) } : v; }) })));
  const confirmSale = (s) => {
    const sale = { id:'s' + Date.now(), date:new Date().toISOString(), status:'ok', voidReason:null, method:s.method, discountPct:s.discountPct, subtotal:s.subtotal, discount:s.discount, total:s.total,
      items:s.items.map((i) => ({ pid:i.pid, vid:i.vid, name:i.name, model:i.model, color:i.color, qty:i.qty, price:i.price })) };
    setSales((x) => [sale, ...x]); bump(s.items.map((i) => ({ vid:i.vid, delta:-i.qty }))); return sale;
  };
  const voidSale = (id, reason) => {
    const s = sales.find((x) => x.id === id);
    setSales((x) => x.map((y) => y.id === id ? { ...y, status:'anulada', voidReason:reason, voidedAt:new Date().toISOString() } : y));
    bump(s.items.map((i) => ({ vid:i.vid, delta:i.qty })));
    return s.items.reduce((a, i) => a + i.qty, 0);
  };
  const createSupplier = (name, contact) => { const s = { id:'sp' + Date.now(), name, contact }; setSuppliers((x) => [...x, s]); return s; };
  const purchase = (items) => bump(items.map((i) => ({ vid:i.vid, delta:i.qty })));
  const createProduct = (p) => { setProducts((ps) => [p, ...ps]); setFocus(p.id); setCatNotice(`“${p.name}” creado con ${p.variants.length} ${p.variants.length === 1 ? 'variante' : 'variantes'}. Sumale fotos para que se vea en la web.`); setTab('catalogo'); };

  if (!authed) return <LoginScreen dk={dk} onLogin={() => { setAuthed(true); localStorage.setItem('lf-adm-auth' + K, '1'); }} />;
  let body;
  if (tab === 'web') body = <WebVentasScreen dk={dk} orders={web} onPaid={markPaid} onCancel={cancelWeb} />;
  else if (tab === 'historial') body = <HistorialScreen dk={dk} sales={sales} onVoid={voidSale} />;
  else if (tab === 'catalogo') body = <CatalogoScreen key={focus || 'cat'} dk={dk} products={products} setProducts={setProducts} focusId={focus} notice={catNotice} clearNotice={() => setCatNotice(null)} />;
  else if (tab === 'compras') body = <ComprasScreen dk={dk} products={products} suppliers={suppliers} onCreateSupplier={createSupplier} onPurchase={purchase} />;
  else if (tab === 'nuevo') body = <NuevoProductoScreen dk={dk} categories={D.categories} onCreate={createProduct} />;
  else body = <VentasScreen dk={dk} products={products} onConfirm={confirmSale} />;
  return (
    <div data-screen-label={tab}>
      <AdminShell dk={dk} badges={{ web:web.filter((o) => o.status === 'pendiente').length }} tab={tab} onTab={(t) => { if (t !== 'catalogo') { setFocus(null); setCatNotice(null); } setTab(t); }} onLogout={() => { setAuthed(false); localStorage.removeItem('lf-adm-auth' + K); }}>{body}</AdminShell>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('app')).render(<AdminApp />);
