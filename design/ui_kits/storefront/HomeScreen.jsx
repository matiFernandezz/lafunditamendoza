const { HeroCarousel, RangeHero, ModelStrip, SectionHeading, CategoryTile, ProductTile, ArrowMark } = window.LaFunditaDesignSystem_371b6e;
function HomeScreen({ go }) {
  const D = window.LF_DATA, A = '../../assets/', dk = !!window.LF_DESKTOP;
  const lab = { fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', fontWeight:600, letterSpacing:'var(--tracking-label)', textTransform:'uppercase' };
  const toCat = (slug) => (e) => { e.preventDefault(); go({ screen:'category', slug }); };
  const cta = (txt, slug) => <a href="#" onClick={toCat(slug)} style={{ ...lab, color:'var(--paper)', display:'inline-flex', alignItems:'center', gap:8, minHeight:44 }}>{txt} <ArrowMark /></a>;
  const scrimTop = (o) => 'linear-gradient(to bottom, rgb(18 18 18 / '+o+'), transparent 50%)';
  const h2 = (fs) => ({ margin:0, fontFamily:'var(--font-display)', fontWeight:600, fontSize:dk ? fs*2 : fs, lineHeight:.95, letterSpacing:'var(--tracking-page)', maxWidth:'10ch' });
  const top = { position:'absolute', inset:0, padding:dk ? '72px var(--page-pad)' : '32px var(--page-pad)', color:'var(--paper)', display:'flex', flexDirection:'column', gap:16 };
  const slides = [
    { src:A+'photos/marble-cases.jpg', alt:'Fundas tornasoladas sobre mesa de madera', content:
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgb(18 18 18 / .78) 0%, rgb(18 18 18 / .35) 45%, rgb(18 18 18 / .05) 75%)', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:dk ? '0 var(--page-pad) 72px' : '0 var(--page-pad) 48px', '--text-hero':dk ? 'clamp(5rem, 10vw, 10.5rem)' : 'min(3.9rem, 15.2vw)', '--text-lead':dk ? '1.375rem' : '.9375rem', '--measure-lead':dk ? undefined : '30ch' }}>
        <RangeHero tone="paper" from="iPhone 11" to="18 Pro Max" animate={false} lead={dk ? 'Fundas y accesorios para tu iPhone. Elegí tu modelo y mirá lo que hay en stock.' : 'Fundas y accesorios para tu iPhone.'} />
      </div> },
    { src:A+'photos/magsafe-colores-mesa.jpg', alt:'Fundas de colores sobre mesa', content:
      <div style={{ ...top, background:scrimTop(.6) }}><span style={{ ...lab, color:'var(--paper-85)' }}>Fundas de diseño</span><h2 style={h2(42)}>Fundas con diseño para vos.</h2>{cta('Ver más','de-diseno')}</div> },
    { src:A+'photos/coleccion-flatlay-a.jpg', alt:'Colección de fundas sobre mesa', content:
      <div style={{ ...top, gap:20, background:scrimTop(.6) }}><h2 style={h2(48)}>Tu iPhone, pero más vos.</h2>{cta('Ver todo','de-diseno')}</div> },
    { src:A+'photos/wave-cases-mesa.jpg', dim:.55, alt:'Fundas de olas sobre mesa de madera', position:'center 40%', content:
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'flex-end', padding:dk ? '0 var(--page-pad) 72px' : '0 var(--page-pad) 72px' }}><img src={A+'logo-transparent.png'} alt="La Fundita" style={{ width:dk ? '30%' : '72%', maxWidth:520, height:'auto', marginLeft:dk ? '-3%' : '-8%' }} /></div> },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'var(--section-gap)', paddingBottom:'var(--main-bottom)' }}>
      <HeroCarousel aspect={dk ? "1584/722" : "4/5"} objectPosition="center" slides={slides} />
      <ModelStrip lines={D.lines} onSelectModel={(m)=>go({screen:'model',model:m.name})} />
      <section style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ padding:'0 var(--page-pad)' }}><SectionHeading size="headline" title="Elegí por categoría" /></div>
        <div style={{ display:'grid', gridTemplateColumns:dk ? 'repeat(4, minmax(0,1fr))' : '1fr 1fr', gap:'var(--tile-gap)', padding:dk ? '0 var(--page-pad)' : 0 }}>
          {D.categories.filter(c=>!c.sub).map((c,i)=><CategoryTile key={c.slug} name={c.name} index={i+1} image={c.image ? A+c.image : null} onClick={(e)=>{e.preventDefault();go({screen:'category',slug:c.slug});}} />)}
        </div>
      </section>
      <section style={{ display:'flex', flexDirection:'column', gap:20, padding:'0 var(--page-pad)' }}>
        <SectionHeading label="Colección destacada" title="Recién llegados." />
        <div style={{ display:'grid', gridTemplateColumns:dk ? 'repeat(4, minmax(0,1fr))' : '1fr 1fr', columnGap:'var(--tile-gap)', rowGap:dk ? 48 : 28 }}>
          {D.products.slice(0,4).map(p=><ProductTile key={p.id} name={p.name} price={'Desde '+D.fmt(p.price)} image={p.images[0] ? A+p.images[0] : null} onClick={(e)=>{e.preventDefault();go({screen:'product',id:p.id});}} />)}
        </div>
      </section>
    </div>
  );
}
window.HomeScreen = HomeScreen;
