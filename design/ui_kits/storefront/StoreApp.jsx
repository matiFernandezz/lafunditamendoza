const { SiteHeader } = window.LaFunditaDesignSystem_371b6e;
function App() {
  const dk = !!window.LF_DESKTOP, KEY = dk ? 'lf-kit-route-desk' : 'lf-kit-route';
  const [route, setRoute] = React.useState(() => { try { return JSON.parse(localStorage.getItem(KEY)) || { screen:'home' }; } catch (e) { return { screen:'home' }; } });
  const cart = useCart();
  const go = (r) => { setRoute(r); localStorage.setItem(KEY, JSON.stringify(r)); window.scrollTo(0, 0); };
  const onNav = (l) => {
    if (l.key === 'home') return go({ screen:'home' });
    if (l.key === 'nosotros') return go({ screen:'about' });
    if (l.key === 'fundas') return go({ screen:'category', slug:'de-diseno' });
    go({ screen:'category', slug:l.key });
  };
  const links = window.LF_DATA.nav.map((l) => ({ ...l, href:'#' }));
  let body;
  if (route.screen === 'category') body = <CategoryScreen key={route.slug} slug={route.slug} go={go} />;
  else if (route.screen === 'model') body = <ModelScreen model={route.model} go={go} />;
  else if (route.screen === 'product') body = <ProductScreen key={route.id} id={route.id} model={route.model} go={go} cart={cart} />;
  else if (route.screen === 'about') body = <AboutScreen />;
  else if (route.screen === 'cart') body = <CartScreen cart={cart} go={go} />;
  else if (route.screen === 'checkout') body = <CheckoutScreen cart={cart} go={go} />;
  else if (route.screen === 'reserva') body = <ReservaScreen id={route.id} go={go} />;
  else body = <HomeScreen go={go} />;
  const hideBar = ['cart', 'checkout', 'reserva'].includes(route.screen);
  return (
    <div data-screen-label={route.screen}>
      <SiteHeader layout={dk ? 'desktop' : 'mobile'} links={links} logoSrc="../../assets/logo-black.jpg" onNavigate={onNav} />
      {body}
      {!hideBar && <CartBar cart={cart} go={go} />}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('app')).render(<App />);
