const LF = window.LaFunditaDesignSystem_371b6e;
const lfCols = (n) => window.LF_DESKTOP ? 'repeat('+n+', minmax(0,1fr))' : '1fr 1fr';
function ProductGrid({ items, go, model }) {
  const D = window.LF_DATA, A = '../../assets/';
  return <div style={{ display:'grid', gridTemplateColumns:lfCols(4), columnGap:'var(--tile-gap)', rowGap:window.LF_DESKTOP ? 48 : 28 }}>
    {items.map(p=><LF.ProductTile key={p.id} name={p.name} price={(model ? '' : 'Desde ')+D.fmt(p.price)} image={p.images[0] ? A+p.images[0] : null} onClick={(e)=>{e.preventDefault();go({screen:'product',id:p.id,model});}} />)}
  </div>;
}
function CategoryScreen({ slug, go }) {
  const D = window.LF_DATA;
  const cat = D.categories.find(c=>c.slug===slug) || D.categories[0];
  const [model, setModel] = React.useState('');
  const items = D.products.filter(p=>p.cat===cat.slug && (!model || p.models.includes(model)));
  const back = (e)=>{e.preventDefault();go(cat.sub ? {screen:'category',slug:cat.sub} : {screen:'home'});};
  const wrap = { display:'flex', flexDirection:'column', gap:'var(--page-gap)', padding:'var(--main-top) var(--page-pad) var(--main-bottom)' };
  if (cat.subs) {
    const subs = cat.subs.map(s=>D.categories.find(c=>c.slug===s));
    return (
      <div style={wrap}>
        <LF.PageHeader title={cat.name} count={subs.length+' tipos'} onBack={back} />
        <div style={{ display:'grid', gridTemplateColumns:lfCols(3), gap:'var(--tile-gap)', margin:window.LF_DESKTOP ? 0 : '0 calc(var(--page-pad) * -1)' }}>
          {subs.map((s,i)=><LF.CategoryTile key={s.slug} name={s.name} index={i+1} image={s.image} onClick={(e)=>{e.preventDefault();go({screen:'category',slug:s.slug});}} />)}
        </div>
      </div>
    );
  }
  return (
    <div style={wrap}>
      <LF.PageHeader parent={cat.parent} title={cat.name} count={items.length} countSuffix={model ? 'para '+model : undefined} backLabel={cat.sub ? 'Accesorios' : 'Inicio'} onBack={back} />
      {!cat.universal && <div style={{ maxWidth:window.LF_DESKTOP ? 360 : 'none' }}><LF.Select label="Elegí tu iPhone" placeholder="Todos los modelos" value={model} onChange={setModel} options={D.allModels} /></div>}
      {items.length === 0
        ? <LF.EmptyState>{model ? 'No hay productos disponibles para '+model+' en esta categoría.' : 'No hay productos disponibles en esta categoría por el momento.'}</LF.EmptyState>
        : <ProductGrid items={items} go={go} model={model || undefined} />}
    </div>
  );
}
function ModelScreen({ model, go }) {
  const D = window.LF_DATA;
  const items = D.products.filter(p=>p.models.includes(model));
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'var(--page-gap)', padding:'var(--main-top) var(--page-pad) var(--main-bottom)' }}>
      <LF.PageHeader title={model} count={items.length} onBack={(e)=>{e.preventDefault();go({screen:'home'});}} />
      {items.length === 0 ? <LF.EmptyState>No hay productos disponibles para {model} por el momento.</LF.EmptyState> : <ProductGrid items={items} go={go} model={model} />}
    </div>
  );
}
function AboutScreen() {
  const dk = !!window.LF_DESKTOP;
  const prose = <div style={{ maxWidth:'var(--measure-prose)', display:'flex', flexDirection:'column', gap:20, fontFamily:'var(--font-body)', fontWeight:300, fontSize:'var(--text-lead)', lineHeight:'var(--leading-relaxed)', color:'var(--graphite)' }}>
    <p style={{ margin:0 }}>La Fundita nace de las ganas de vestir tu iPhone con algo que realmente se sienta tuyo: fundas y accesorios elegidos y armados a mano, uno por uno.</p>
    <p style={{ margin:0 }}>Vendemos en ferias y por WhatsApp, así que si tenés dudas de stock, combinaciones de color o querés encargar algo puntual, el mejor camino es escribirnos directo.</p>
  </div>;
  const photo = <div style={{ aspectRatio:'4/5', margin:dk ? 0 : '0 calc(var(--page-pad) * -1)', background:'url(../../assets/photos/coleccion-flatlay-b.jpg) center/cover' }}></div>;
  const note = <LF.EmptyState align="left">Acá van los datos de contacto reales (WhatsApp / Instagram).</LF.EmptyState>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'var(--page-gap)', padding:'var(--main-top) var(--page-pad) var(--main-bottom)' }}>
      <LF.PageHeader title="Nosotros" showBack={false} />
      {dk
        ? <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:64, alignItems:'start' }}><div style={{ display:'flex', flexDirection:'column', gap:'var(--page-gap)' }}>{prose}{note}</div>{photo}</div>
        : <>{prose}{photo}{note}</>}
    </div>
  );
}
Object.assign(window, { CategoryScreen, ModelScreen, AboutScreen });
