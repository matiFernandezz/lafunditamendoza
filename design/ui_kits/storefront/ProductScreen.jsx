function ProductScreen({ id, model: initialModel, go, cart }) {
  const LF = window.LaFunditaDesignSystem_371b6e, D = window.LF_DATA, A = '../../assets/';
  const p = D.products.find(x=>x.id===id) || D.products[0];
  const [model, setModel] = React.useState(initialModel && p.models.includes(initialModel) ? initialModel : p.models[0]);
  const [color, setColor] = React.useState(p.colors[0]);
  const cat = D.categories.find(c=>c.slug===p.cat);
  const dk = !!window.LF_DESKTOP;
  const stock = Math.max(0, p.stock - (window.LF_RES ? window.LF_RES.reservedFor(p.name) : 0));
  const [added, setAdded] = React.useState(false);
  React.useEffect(() => setAdded(false), [model, color]);
  const add = () => { if (!cart) return; cart.add({ key:p.id + '|' + (model || '') + '|' + color, id:p.id, name:p.name, model:p.models.length ? model : null, color, price:p.price, qty:1, max:stock, image:p.images[0] ? A + p.images[0] : null }); setAdded(true); };
  const lab = { display:'block', marginBottom:8, fontFamily:'var(--font-body)', fontWeight:500 };
  return (
    <div style={{ paddingBottom:'var(--main-bottom)' }}>
      <div style={{ padding:dk ? '32px var(--page-pad) 24px' : '16px var(--page-pad) 12px' }}><LF.BackLink onClick={(e)=>{e.preventDefault();go({screen:'category',slug:p.cat});}}>{cat ? cat.name : 'Inicio'}</LF.BackLink></div>
      <div style={dk ? { display:'grid', gridTemplateColumns:'minmax(0,7fr) minmax(0,5fr)', gap:64, padding:'0 var(--page-pad)', alignItems:'start' } : {}}>
      <LF.ProductGallery images={p.images.map(i=>A+i)} alt={p.name} />
      <div style={{ display:'flex', flexDirection:'column', gap:24, padding:dk ? '16px 0 0' : '32px var(--page-pad) 0', position:dk ? 'sticky' : 'static', top:112 }}>
        <div>
          <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontWeight:600, fontSize:'var(--text-section)', lineHeight:'var(--leading-tight)', letterSpacing:'var(--tracking-tight)' }}>{p.name}</h1>
          {p.desc && <p style={{ margin:'8px 0 0', fontFamily:'var(--font-body)', fontWeight:300, color:'var(--graphite)' }}>{p.desc}</p>}
        </div>
        {p.models.length > 0 && <LF.Select label="Elegí tu modelo" value={model} onChange={setModel} options={p.models} />}
        <div><span style={lab}>Color</span><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{p.colors.map(c=><LF.Chip key={c} selected={c===color} onClick={()=>setColor(c)}>{c}</LF.Chip>)}</div></div>
        <LF.PriceBlock price={p.price} stock={stock} sku={(p.id.slice(0,3)+'-'+(model || 'U').replace('iPhone ','').replace(/ /g,'')+'-'+color.slice(0,2)).toUpperCase()} />
        <LF.Button fullWidth disabled={stock === 0} onClick={add}>{stock === 0 ? 'Sin stock' : 'Agregar al carrito'}</LF.Button>
        {added && <div role="status" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginTop:-8, fontFamily:'var(--font-body)', fontSize:15, color:'var(--ink)' }}><span>Agregado al carrito.</span><button type="button" onClick={() => go({ screen:'cart' })} style={{ minHeight:44, border:0, background:'transparent', padding:0, fontFamily:'var(--font-body)', fontSize:15, fontWeight:500, color:'var(--ink)', textDecoration:'underline', textUnderlineOffset:3, cursor:'pointer' }}>Ver carrito</button></div>}
      </div>
      </div>
    </div>
  );
}
window.ProductScreen = ProductScreen;
