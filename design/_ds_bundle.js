/* @ds-bundle: {"format":4,"namespace":"LaFunditaDesignSystem_371b6e","components":[{"name":"ArrowMark","sourcePath":"components/brand/ArrowMark.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"CategoryTile","sourcePath":"components/catalog/CategoryTile.jsx"},{"name":"EmptyState","sourcePath":"components/catalog/EmptyState.jsx"},{"name":"HeroCarousel","sourcePath":"components/catalog/HeroCarousel.jsx"},{"name":"ModelStrip","sourcePath":"components/catalog/ModelStrip.jsx"},{"name":"PriceBlock","sourcePath":"components/catalog/PriceBlock.jsx"},{"name":"ProductGallery","sourcePath":"components/catalog/ProductGallery.jsx"},{"name":"ProductTile","sourcePath":"components/catalog/ProductTile.jsx"},{"name":"RangeHero","sourcePath":"components/catalog/RangeHero.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Select","sourcePath":"components/core/Select.jsx"},{"name":"BackLink","sourcePath":"components/navigation/BackLink.jsx"},{"name":"PageHeader","sourcePath":"components/navigation/PageHeader.jsx"},{"name":"SectionHeading","sourcePath":"components/navigation/SectionHeading.jsx"},{"name":"SiteHeader","sourcePath":"components/navigation/SiteHeader.jsx"}],"sourceHashes":{"components/brand/ArrowMark.jsx":"294524ab30e8","components/brand/Logo.jsx":"ca3d9702c236","components/catalog/CategoryTile.jsx":"37f0d80a11f2","components/catalog/EmptyState.jsx":"fc24c9ccdfa7","components/catalog/HeroCarousel.jsx":"d9cb2b556b8e","components/catalog/ModelStrip.jsx":"545bad5206af","components/catalog/PriceBlock.jsx":"6ba4a93415e0","components/catalog/ProductGallery.jsx":"ef533007fb64","components/catalog/ProductTile.jsx":"989d68e3241d","components/catalog/RangeHero.jsx":"83694c489fb1","components/core/Button.jsx":"32d02b927360","components/core/Chip.jsx":"831e2c5bea69","components/core/Select.jsx":"49ff4e02e7a7","components/navigation/BackLink.jsx":"314735a39743","components/navigation/PageHeader.jsx":"f23238e24f70","components/navigation/SectionHeading.jsx":"032d17febe4f","components/navigation/SiteHeader.jsx":"e11fb993e726","doc-page.js":"f52ae9c02fca","ui_kits/admin/AdminApp.jsx":"e7febeb50acb","ui_kits/admin/AdminShell.jsx":"d33aeafee175","ui_kits/admin/CatalogoScreen.jsx":"14d7595b35be","ui_kits/admin/ComprasScreens.jsx":"90578f610c91","ui_kits/admin/HistorialScreen.jsx":"d6796ac1eed1","ui_kits/admin/VentasScreen.jsx":"c1233533eb8e","ui_kits/admin/WebVentasScreen.jsx":"585abc3a31af","ui_kits/admin/adminData.js":"8f6ea0a2a744","ui_kits/admin/adminUI.jsx":"ec1223afe3ac","ui_kits/shared/reservas.js":"218dea022163","ui_kits/storefront/CartScreens.jsx":"b68177a2359b","ui_kits/storefront/CatalogScreens.jsx":"76a5027626e5","ui_kits/storefront/HomeScreen.jsx":"074cbe5ab142","ui_kits/storefront/ProductScreen.jsx":"69dbb9821eed","ui_kits/storefront/StoreApp.jsx":"922410cb1ee7","ui_kits/storefront/data.js":"c00035fcff36"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LaFunditaDesignSystem_371b6e = window.LaFunditaDesignSystem_371b6e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/ArrowMark.jsx
try { (() => {
/** Flecha de trazo cuadrado con junta en inglete (copiada de ArrowMark.tsx). */
function ArrowMark({
  width = 16,
  height = 10,
  strokeWidth = 5,
  direction = 'right',
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 64 40",
    width: width,
    height: height,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "butt",
    strokeLinejoin: "miter",
    "aria-hidden": "true",
    style: {
      display: 'block',
      flexShrink: 0,
      transform: direction === 'left' ? 'rotate(180deg)' : undefined,
      ...style
    }
  }, /*#__PURE__*/React.createElement("path", {
    pathLength: 1,
    d: "M4 20H58M42 4L58 20L42 36"
  }));
}
Object.assign(__ds_scope, { ArrowMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/ArrowMark.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
/** Logo oficial "La fun dita." — siempre la imagen, nunca redibujado. crop=true recorta el aire negro del JPG para que la marca se lea a tamaños chicos (header). */
function Logo({
  size = 44,
  src = 'assets/logo-black.jpg',
  variant = 'black',
  alt = 'La Fundita',
  crop = false,
  style
}) {
  const file = variant === 'transparent' && src === 'assets/logo-black.jpg' ? 'assets/logo-transparent.png' : src;
  if (crop) {
    // La marca ocupa ~42% x 48% del cuadrado (centro ≈ 54%, 52%). Caja 7:8 a su alrededor.
    const w = size * 0.875,
      img = size / 0.5;
    return /*#__PURE__*/React.createElement("span", {
      role: "img",
      "aria-label": alt,
      style: {
        display: 'block',
        position: 'relative',
        width: w,
        height: size,
        overflow: 'hidden',
        flexShrink: 0,
        ...style
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: file,
      alt: "",
      width: img,
      height: img,
      style: {
        position: 'absolute',
        width: img,
        height: img,
        maxWidth: 'none',
        left: w / 2 - img * 0.54,
        top: size / 2 - img * 0.518
      }
    }));
  }
  return /*#__PURE__*/React.createElement("img", {
    src: file,
    alt: alt,
    width: size,
    height: size,
    style: {
      display: 'block',
      width: size,
      height: size,
      ...style
    }
  });
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/catalog/CategoryTile.jsx
try { (() => {
/** Mosaico de categoría: foto a sangre, velo de tinta abajo, nombre arriba e índice grande abajo. */
function CategoryTile({
  name,
  index = 1,
  image,
  href = '#',
  onClick,
  aspect = '4/5'
}) {
  const [h, setH] = React.useState(false);
  const lab = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase'
  };
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      aspectRatio: aspect,
      overflow: 'hidden',
      background: 'var(--surface-tile-fallback)',
      color: 'var(--paper)',
      borderRadius: 'var(--radius-photo)'
    }
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: .8,
      transform: h ? 'scale(var(--hover-zoom-tile))' : 'none',
      transition: 'transform var(--dur-image) ease'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim-photo)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: 16,
      maxWidth: '12ch',
      ...lab
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-section)',
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: 'var(--tracking-tight)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, String(index).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      ...lab
    }
  }, "Ver m\xE1s", /*#__PURE__*/React.createElement(__ds_scope.ArrowMark, {
    width: 16,
    height: 10,
    strokeWidth: 5,
    style: {
      transform: h ? 'translateX(2px)' : 'none',
      transition: 'transform var(--dur-fast)'
    }
  }))));
}
Object.assign(__ds_scope, { CategoryTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/CategoryTile.jsx", error: String((e && e.message) || e) }); }

// components/catalog/EmptyState.jsx
try { (() => {
/** Aviso vacío con borde discontinuo en regla. */
function EmptyState({
  children,
  align = 'center'
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      borderRadius: 'var(--radius-container)',
      border: '1px dashed var(--rule)',
      padding: 32,
      textAlign: align,
      fontFamily: 'var(--font-body)',
      color: 'var(--graphite)'
    }
  }, children);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/catalog/HeroCarousel.jsx
try { (() => {
/** Hero carrusel a sangre: cada slide es una foto, un fondo liso, contenido propio, o combinación. Crossfade 700ms cada 6s. */
function HeroCarousel({
  slides = [],
  aspect = '4/5',
  interval = 6000,
  objectPosition = 'left center',
  children
}) {
  const [i, setI] = React.useState(0);
  const n = slides.length;
  React.useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI(x => (x + 1) % n), interval);
    return () => clearInterval(t);
  }, [n, interval, i]);
  const light = slides[i] && slides[i].tone === 'light';
  const fg = light ? 'var(--ink)' : 'var(--paper)';
  const btn = side => ({
    position: 'absolute',
    top: '50%',
    [side]: 8,
    transform: 'translateY(-50%)',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    border: 'none',
    background: light ? 'rgb(18 18 18 / .06)' : 'rgb(18 18 18 / .28)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    color: fg,
    cursor: 'pointer',
    fontSize: 26,
    lineHeight: 1,
    padding: '0 0 3px',
    transition: 'color var(--dur-hero), background var(--dur-hero)'
  });
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--ink)',
      aspectRatio: aspect,
      width: '100%'
    }
  }, slides.map((s, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    "aria-hidden": k !== i,
    style: {
      position: 'absolute',
      inset: 0,
      background: s.background || 'transparent',
      opacity: k === i ? 1 : 0,
      pointerEvents: k === i ? 'auto' : 'none',
      transition: 'opacity var(--dur-hero)'
    }
  }, s.src && /*#__PURE__*/React.createElement("img", {
    src: s.src,
    alt: s.alt || '',
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: s.position || objectPosition,
      filter: s.dim ? 'brightness(' + s.dim + ')' : undefined
    }
  }), s.content && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, s.content))), children && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, children), n > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Slide anterior",
    style: btn('left'),
    onClick: () => setI(x => (x - 1 + n) % n)
  }, "\u2039"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Slide siguiente",
    style: btn('right'),
    onClick: () => setI(x => (x + 1) % n)
  }, "\u203A"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 'var(--page-pad)',
      bottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      color: fg,
      transition: 'color var(--dur-hero)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 1,
      background: light ? 'var(--rule)' : 'var(--paper-40)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      background: fg,
      width: (i + 1) / n * 100 + '%',
      transition: 'width var(--dur-progress)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-small)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, String(i + 1).padStart(2, '0'), " / ", String(n).padStart(2, '0')))));
}
Object.assign(__ds_scope, { HeroCarousel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/HeroCarousel.jsx", error: String((e && e.message) || e) }); }

// components/catalog/PriceBlock.jsx
try { (() => {
const fmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});
/** Precio grande en mono + stock + SKU, separado por regla arriba. */
function PriceBlock({
  price,
  stock,
  sku,
  lowStock = 3,
  divider = true
}) {
  const p = typeof price === 'number' ? fmt.format(price) : price;
  const st = stock == null ? null : stock <= lowStock ? stock === 1 ? 'Última unidad' : 'Quedan ' + stock : 'En stock';
  const low = stock != null && stock <= lowStock;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      borderTop: divider ? '1px solid var(--rule)' : 'none',
      paddingTop: divider ? 24 : 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-price-lg)',
      fontWeight: 500,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--ink)'
    }
  }, p), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-small)',
      color: 'var(--graphite)'
    }
  }, low && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'var(--ink)'
    }
  }), st && /*#__PURE__*/React.createElement("span", {
    style: {
      color: low ? 'var(--ink)' : undefined,
      fontWeight: low ? 500 : 400
    }
  }, st), st && sku && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\xB7"), sku && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)'
    }
  }, sku)));
}
Object.assign(__ds_scope, { PriceBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/PriceBlock.jsx", error: String((e && e.message) || e) }); }

// components/catalog/ProductGallery.jsx
try { (() => {
/** Galería del detalle: swipe con snap, puntos (≤2 fotos) o miniaturas (>2). Fotos en rectángulo simple. */
function ProductGallery({
  images = [],
  alt = '',
  aspect = '4/5'
}) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(0);
  const box = {
    position: 'relative',
    aspectRatio: aspect,
    width: '100%',
    flexShrink: 0,
    scrollSnapAlign: 'start',
    background: 'var(--surface-photo-empty)',
    overflow: 'hidden'
  };
  const img = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  };
  if (!images.length) return /*#__PURE__*/React.createElement("div", {
    style: {
      ...box,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      color: 'var(--graphite)'
    }
  }, "Sin foto");
  if (images.length === 1) return /*#__PURE__*/React.createElement("div", {
    style: box
  }, /*#__PURE__*/React.createElement("img", {
    src: images[0],
    alt: alt,
    style: img
  }));
  const to = i => {
    const el = ref.current;
    if (el) el.scrollTo({
      left: i * el.clientWidth,
      behavior: 'smooth'
    });
  };
  const onScroll = () => {
    const el = ref.current;
    if (el && el.clientWidth) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };
  const arrow = (side, dis, fn, ch) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: fn,
    disabled: dis,
    "aria-label": side === 'left' ? 'Foto anterior' : 'Foto siguiente',
    style: {
      position: 'absolute',
      [side]: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 36,
      height: 36,
      borderRadius: 9999,
      border: 'none',
      background: 'var(--paper-90)',
      color: 'var(--ink)',
      fontSize: 20,
      lineHeight: 1,
      cursor: 'pointer',
      opacity: dis ? .4 : 1
    }
  }, ch);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    onScroll: onScroll,
    style: {
      display: 'flex',
      overflowX: 'auto',
      scrollSnapType: 'x mandatory',
      scrollbarWidth: 'none'
    }
  }, images.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: box
  }, /*#__PURE__*/React.createElement("img", {
    src: s,
    alt: alt,
    style: img
  })))), arrow('left', active === 0, () => to(Math.max(0, active - 1)), '‹'), arrow('right', active === images.length - 1, () => to(Math.min(images.length - 1, active + 1)), '›')), images.length > 2 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: 'auto'
    }
  }, images.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    onClick: () => to(i),
    "aria-label": 'Ir a la foto ' + (i + 1),
    "aria-current": i === active,
    style: {
      position: 'relative',
      width: 64,
      height: 64,
      flexShrink: 0,
      padding: 0,
      overflow: 'hidden',
      borderRadius: 'var(--radius-photo)',
      border: '1px solid ' + (i === active ? 'var(--ink)' : 'var(--rule)'),
      background: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: s,
    alt: "",
    style: img
  })))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 6
    }
  }, images.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    onClick: () => to(i),
    "aria-label": 'Ir a la foto ' + (i + 1),
    style: {
      width: 6,
      height: 6,
      padding: 0,
      border: 'none',
      borderRadius: 9999,
      background: i === active ? 'var(--ink)' : 'var(--rule)',
      cursor: 'pointer'
    }
  }))));
}
Object.assign(__ds_scope, { ProductGallery });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/ProductGallery.jsx", error: String((e && e.message) || e) }); }

// components/catalog/ProductTile.jsx
try { (() => {
/** Card de producto: foto en rectángulo simple + nombre (Space Grotesk) + precio (mono). */
function ProductTile({
  name,
  price,
  image,
  href = '#',
  onClick,
  aspect = '4/5'
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'block',
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: aspect,
      width: '100%',
      overflow: 'hidden',
      borderRadius: 'var(--radius-photo)',
      background: 'var(--surface-photo-empty)'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: name,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: h ? 'scale(var(--hover-zoom-photo))' : 'none',
      transition: 'transform var(--dur-image) ease'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-small)',
      color: 'var(--graphite)'
    }
  }, "Sin foto")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      paddingTop: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-card)',
      fontWeight: 600,
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-tight)',
      textDecoration: h ? 'underline' : 'none',
      textUnderlineOffset: 3
    }
  }, name), price != null && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-small)',
      color: 'var(--graphite)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, price)));
}
Object.assign(__ds_scope, { ProductTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/ProductTile.jsx", error: String((e && e.message) || e) }); }

// components/catalog/RangeHero.jsx
try { (() => {
const KF = '@keyframes lf-rise{from{transform:translateY(105%)}to{transform:translateY(0)}}@keyframes lf-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@media (prefers-reduced-motion:reduce){.lf-rise,.lf-draw path{animation:none!important}}';
/** Hero tipográfico firma: "iPhone 11 →" / "17 Pro Max" en Space Grotesk, con subida enmascarada. */
function RangeHero({
  from = 'iPhone 11',
  to = '18 Pro Max',
  lead,
  animate = true,
  tone = 'ink'
}) {
  const c = tone === 'paper' ? 'var(--paper)' : 'var(--ink)';
  const line = d => ({
    display: 'block',
    animation: animate ? 'lf-rise var(--dur-hero) var(--ease-out) ' + d + 'ms both' : 'none'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("style", null, KF), /*#__PURE__*/React.createElement("h1", {
    "aria-label": from + ' a ' + to,
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-hero)',
      fontWeight: 600,
      lineHeight: 'var(--leading-hero)',
      letterSpacing: 'var(--tracking-hero)',
      color: c
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      overflow: 'hidden',
      padding: '.1em 0',
      margin: '-.1em 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lf-rise",
    style: {
      ...line(0),
      display: 'flex',
      alignItems: 'center',
      gap: '.2em',
      whiteSpace: 'nowrap'
    }
  }, from, /*#__PURE__*/React.createElement("span", {
    className: "lf-draw",
    style: {
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 64 40",
    style: {
      width: '.9em',
      height: '.56em'
    },
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "6",
    strokeLinecap: "butt",
    strokeLinejoin: "miter",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    pathLength: 1,
    d: "M4 20H58M42 4L58 20L42 36",
    style: {
      strokeDasharray: 1,
      animation: animate ? 'lf-draw var(--dur-draw) var(--ease-out) 300ms both' : 'none'
    }
  }))))), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      overflow: 'hidden',
      padding: '.1em 0',
      margin: '-.1em 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lf-rise",
    style: {
      ...line(90),
      whiteSpace: 'nowrap'
    }
  }, to))), lead && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 'var(--measure-lead)',
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: 'var(--text-lead)',
      lineHeight: 'var(--leading-body)',
      color: tone === 'paper' ? 'var(--paper-85)' : 'var(--graphite)'
    }
  }, lead));
}
Object.assign(__ds_scope, { RangeHero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/RangeHero.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Botón primario de 56px, tinta sobre papel. Presionado escala a 0.98. */
function Button({
  children,
  variant = 'primary',
  href,
  onClick,
  fullWidth = false,
  disabled = false,
  type = 'button',
  style
}) {
  const [pressed, setPressed] = React.useState(false);
  const inverse = variant === 'inverse';
  const s = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 'var(--control-h)',
    padding: '0 24px',
    width: fullWidth ? '100%' : undefined,
    borderRadius: 'var(--radius-control)',
    border: variant === 'outline' ? '1px solid var(--border-control)' : 'none',
    background: variant === 'outline' ? 'transparent' : inverse ? 'var(--paper)' : 'var(--ink)',
    color: variant === 'outline' || inverse ? 'var(--ink)' : 'var(--paper)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-body)',
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transform: pressed && !disabled ? 'scale(var(--press-scale))' : 'none',
    transition: 'transform var(--dur-fast) ease',
    textDecoration: 'none',
    boxSizing: 'border-box',
    ...style
  };
  const h = {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false)
  };
  if (href && !disabled) return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    onClick: onClick,
    style: s
  }, h), children);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    onClick: onClick,
    disabled: disabled,
    style: s
  }, h), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Píldora seleccionable: color de variante (44px) o sub-modelo de iPhone. */
function Chip({
  children,
  selected = false,
  size = 'md',
  href,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const on = selected;
  const s = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: size === 'md' ? 'var(--chip-h)' : undefined,
    padding: size === 'md' ? '0 16px' : '8px 16px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid ' + (on || hover ? 'var(--ink)' : 'var(--graphite)'),
    background: on || hover && size === 'sm' ? 'var(--ink)' : 'transparent',
    color: on || hover && size === 'sm' ? 'var(--paper)' : 'var(--ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-small)',
    fontWeight: 500,
    textTransform: size === 'md' ? 'capitalize' : 'none',
    cursor: 'pointer',
    transition: 'background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...style
  };
  const p = {
    style: s,
    onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  };
  return href ? /*#__PURE__*/React.createElement("a", _extends({
    href: href
  }, p), children) : /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-pressed": on
  }, p), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/catalog/ModelStrip.jsx
try { (() => {
/** Franja "Elegí tu iPhone": números grandes por línea (11…17, Air) que despliegan sub-modelos. */
function ModelStrip({
  lines = [],
  onSelectModel,
  label = 'Elegí tu iPhone'
}) {
  const [open, setOpen] = React.useState(null);
  const pad = '0 var(--page-pad)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--rule)',
      borderBottom: '1px solid var(--rule)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '16px var(--page-pad)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      fontSize: 'var(--text-small)',
      color: 'var(--graphite)'
    }
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      textTransform: 'none'
    }
  }, "\u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))',
      justifyItems: 'center',
      columnGap: 8,
      rowGap: 20,
      padding: '4px var(--page-pad) 24px'
    }
  }, lines.map(l => /*#__PURE__*/React.createElement(LineButton, {
    key: l.label,
    line: l,
    open: open === l.label,
    onClick: () => l.models && l.models.length > 1 ? setOpen(open === l.label ? null : l.label) : onSelectModel && onSelectModel(l.models ? l.models[0] : {
      name: l.label
    })
  }))), lines.map(l => l.models && l.models.length > 1 && open === l.label ? /*#__PURE__*/React.createElement("div", {
    key: l.label,
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      borderTop: '1px solid var(--rule)',
      padding: '16px var(--page-pad)'
    }
  }, l.models.map(m => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: m.name,
    size: "sm",
    href: m.href || '#',
    onClick: e => {
      if (onSelectModel) {
        e.preventDefault();
        onSelectModel(m);
      }
    }
  }, m.name))) : null));
}
function LineButton({
  line,
  open,
  onClick
}) {
  const [h, setH] = React.useState(false);
  const single = !line.models || line.models.length === 1;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    "aria-expanded": single ? undefined : open,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--ink)',
      minWidth: 44
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-model)',
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: 'var(--tracking-tight)',
      opacity: h && !open ? .6 : 1,
      transition: 'opacity var(--dur-fast)',
      borderBottom: open ? '2px solid var(--ink)' : '2px solid transparent'
    }
  }, line.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      color: 'var(--graphite)'
    }
  }, single && line.models ? line.models[0].name : 'iPhone ' + line.label));
}
Object.assign(__ds_scope, { ModelStrip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/ModelStrip.jsx", error: String((e && e.message) || e) }); }

// components/core/Select.jsx
try { (() => {
/** Select nativo de 56px con etiqueta visible y chevron de terminal cuadrada. */
function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  id: idProp,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const [autoId] = React.useState(() => 'select-' + Math.random().toString(36).slice(2, 7));
  const id = idProp || autoId;
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'block',
      marginBottom: 8,
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: 'var(--text-body)',
      color: 'var(--ink)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: id,
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      height: 'var(--control-h)',
      width: '100%',
      appearance: 'none',
      WebkitAppearance: 'none',
      borderRadius: 'var(--radius-control)',
      border: '1px solid ' + (hover ? 'var(--ink)' : 'var(--graphite)'),
      background: 'transparent',
      padding: '0 48px 0 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-body)',
      fontWeight: 500,
      color: 'var(--ink)',
      transition: 'border-color var(--dur-fast)',
      cursor: 'pointer'
    }
  }, placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 16 16",
    width: "16",
    height: "16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "square",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      right: 16,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 6l5 5 5-5"
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BackLink.jsx
try { (() => {
/** Enlace "Inicio" con flecha girada; grafito → tinta en hover. */
function BackLink({
  children = 'Inicio',
  href = '#',
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
      margin: '-4px 0',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-small)',
      color: h ? 'var(--ink)' : 'var(--graphite)',
      transition: 'color var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.ArrowMark, {
    width: 16,
    height: 10,
    strokeWidth: 5,
    direction: "left"
  }), children);
}
Object.assign(__ds_scope, { BackLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BackLink.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PageHeader.jsx
try { (() => {
/** Encabezado de página interior: BackLink + h1 display + conteo en grafito. */
function PageHeader({
  title,
  parent,
  count,
  countSuffix,
  backHref = '#',
  backLabel = 'Inicio',
  onBack,
  showBack = true
}) {
  const countText = typeof count === 'number' ? count === 1 ? '1 producto' : count + ' productos' : count;
  return /*#__PURE__*/React.createElement("div", null, showBack && /*#__PURE__*/React.createElement(__ds_scope.BackLink, {
    href: backHref,
    onClick: onBack
  }, backLabel), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: showBack ? '12px 0 0' : 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-page)',
      fontWeight: 600,
      lineHeight: 'var(--leading-page)',
      letterSpacing: 'var(--tracking-page)',
      color: 'var(--ink)'
    }
  }, parent && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--graphite)'
    }
  }, parent, " / "), title), countText != null && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      fontFamily: 'var(--font-body)',
      color: 'var(--graphite)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, countText, countSuffix && /*#__PURE__*/React.createElement("span", null, " ", countSuffix)));
}
Object.assign(__ds_scope, { PageHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PageHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SectionHeading.jsx
try { (() => {
/** Título de sección editorial: etiqueta opcional en mayúsculas + h2 en Space Grotesk. */
function SectionHeading({
  label,
  title,
  size = 'section',
  tone = 'ink',
  action
}) {
  const inv = tone === 'paper';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, label && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 4px',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: inv ? 'var(--paper-70)' : 'var(--graphite)'
    }
  }, label), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: size === 'headline' ? 'var(--text-headline)' : 'var(--text-section)',
      fontWeight: 600,
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-tight)',
      color: inv ? 'var(--paper)' : 'var(--ink)'
    }
  }, title)), action);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SiteHeader.jsx
try { (() => {
function useIsDesktop(layout) {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 768px)') : null;
  const [d, setD] = React.useState(q ? q.matches : false);
  React.useEffect(() => {
    if (!q) return;
    const f = e => setD(e.matches);
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);
  return layout === 'desktop' ? true : layout === 'mobile' ? false : d;
}

/** Header sticky negro puro (80px): logo, nav de categorías, menú hamburguesa en mobile. */
function SiteHeader({
  links = [],
  logoSrc = 'assets/logo-black.jpg',
  homeHref = '#',
  onNavigate,
  layout = 'auto',
  sticky = true
}) {
  const desktop = useIsDesktop(layout);
  const [open, setOpen] = React.useState(false);
  const go = l => e => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(l);
    }
    setOpen(false);
  };
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: sticky ? 'sticky' : 'relative',
      top: 0,
      zIndex: 20,
      background: 'var(--surface-header)',
      color: 'var(--paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      height: 'var(--header-h)',
      padding: desktop ? '0 clamp(48px, 9vw, 180px)' : '0 calc(var(--page-pad) + 12px)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: homeHref,
    onClick: go({
      key: 'home',
      href: homeHref
    }),
    "aria-label": "La Fundita \u2014 inicio",
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    crop: true,
    size: desktop ? 60 : 56,
    src: logoSrc
  })), desktop ? /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Categor\xEDas",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 32
    }
  }, links.map(l => /*#__PURE__*/React.createElement(NavItem, {
    key: l.label,
    l: l,
    onClick: go(l)
  }))) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(o => !o),
    "aria-expanded": open,
    style: {
      width: 44,
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'none',
      border: 'none',
      color: 'var(--paper)',
      cursor: 'pointer',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      width: 1,
      height: 1,
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)'
    }
  }, open ? 'Cerrar menú' : 'Abrir menú'), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "24",
    height: "24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, open ? /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M18 6L6 18"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M4 7h16M4 12h16M4 17h16"
  })))), !desktop && open && /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Categor\xEDas",
    style: {
      borderTop: '1px solid var(--paper-15)',
      padding: '8px var(--page-pad)'
    }
  }, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement("li", {
    key: l.label,
    style: {
      borderBottom: i === links.length - 1 ? 'none' : '1px solid var(--paper-10)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: l.href || '#',
    onClick: go(l),
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 56,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-title)',
      fontWeight: 600,
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--paper)'
    }
  }, l.label))))));
}
function NavItem({
  l,
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: l.href || '#',
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-small)',
      fontWeight: 600,
      letterSpacing: '.025em',
      color: h || l.active ? 'var(--paper)' : 'var(--paper-85)',
      transition: 'color var(--dur-fast)'
    }
  }, l.label);
}
Object.assign(__ds_scope, { SiteHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SiteHeader.jsx", error: String((e && e.message) || e) }); }

// doc-page.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <doc-page> — paged-document shell for printable HTML.
 *
 * FIRST, decide how the document paginates — up front, before building:
 *
 * - FLOWING document (the default): write the whole document as one
 *   normal HTML flow inside <doc-page>; the browser's print engine
 *   splits it onto pages at export. Use for long-form documents with a
 *   single text flow: reports, memos, letters, essays.
 * - EXPLICIT pagination: a fixed set of pre-paginated pages, one
 *   <section class="page"> child per page. Use when the user asks for a
 *   specific page count, or the design implies one: a one-page resume, a
 *   two-sided flier, a poster, a certificate, a brochure — any richly
 *   laid-out document without a single text flow.
 * - If in doubt, ask the user as part of the build.
 *
 * PAGE SIZING — paper differs by country (letter vs A4), so the printed
 * sheet is not one fixed truth:
 * - FLOWING documents pin NO paper size: the print engine paginates
 *   onto the user's real paper, and the content reflows to it.
 * - EXPLICITLY PAGINATED documents print each page at a FIXED page box
 *   with overflow hidden — letter by default, size="a4" for a clearly
 *   metric user, the user's chosen paper when they export. Design each
 *   page to FILL that box, fitting letter and A4 alike without overlap.
 * - width/height pin an explicit fixed size, ONLY when the user gives
 *   one.
 * Never write your own @page rule or hard-code paper dimensions in the
 * content.
 *
 * Sizing modes (attributes):
 *   (none)                      — portrait: flowing docs use the user's
 *           paper; explicitly paginated pages use the named size box
 *           (letter unless size="a4")
 *   orientation="landscape"     — the same, landscape
 *   width / height              — explicit fixed size, ONLY when the user
 *           gives one (e.g. width="22in" height="30in" for a 22×30
 *           poster): the page IS the design's size, printed at true
 *           dimensions (or scaled onto the user's paper at print time).
 *           Any absolute CSS length: px/in/mm/cm/pt/pc.
 * The component announces the chosen mode to the host app at runtime (a
 * meta tag it injects), so the print path can inject the user's true
 * paper size.
 *
 * On screen the document renders on a desk background: a flowing
 * document as one tall scrolling sheet (Google Docs' pageless view);
 * explicitly paginated documents as one card per page.
 *
 * EXPLICIT pagination usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page>
 *     <section class="page" id="p1">…one page's design…</section>
 *     <section class="page" id="p2">…</section>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * How the page box works, concretely: each .page prints as ONE full-bleed
 * sheet at a FIXED physical size — letter by default (set size="a4" for
 * a clearly metric user), the user's chosen paper when they export —
 * with overflow hidden. Nothing scrolls and nothing reflows onto a next
 * sheet: content that misses the box is CLIPPED. Design each page to
 * FILL that page box, and to fit it — letter and A4 alike — without
 * overlap. Each page is a size container; don't size anything in
 * viewport units (they track the window, not the page), and never set
 * width or height on the .page section itself (the component sizes the
 * page box; an authored height like 100% is meaningless at print and is
 * overridden). The component owns the page box, the screen card chrome,
 * and the page breaks (never add your own break-before/after). Don't mix
 * .page sections with flowing content or header/footer slots in the same
 * document.
 *
 * FLOWING usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page margin="0.75in">
 *     <h1>Title</h1>
 *     <p>…body…</p>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * There is no manual page-splitting — the browser's print engine
 * paginates at export. Standard break-hygiene rules (`break-inside:
 * avoid` on figures, code blocks, images and table rows; `orphans/
 * widows: 3`) are applied so paragraphs and groups split cleanly. On
 * screen and at print, headings default to `text-wrap: balance` and
 * body text to `text-wrap: pretty`; the defaults have zero specificity,
 * so any text-wrap you declare wins.
 *
 * Other attributes:
 *   size    — letter | a4 | legal (default letter). Flowing documents:
 *           preview proportion only — it does NOT pin their printed
 *           paper (the print dialog's paper governs); leave it alone
 *           there. Explicitly paginated documents: it sets the page box
 *           the cards and the pinned @page share (the export dialog's
 *           choice overrides both at print) — set size="a4" for a
 *           clearly metric user. Scaled-fit: names the sheet the fit is
 *           computed against, same a4-for-metric-users advice.
 *   content-width / content-height — the design's own fixed dimensions
 *           (CSS lengths), for scaling a fixed-size design ONTO the
 *           named sheet: content lays out at exactly this size, and the
 *           component scales it to fit that sheet's printable area
 *           (centered horizontally, top-aligned; the export dialog
 *           re-fits to the user's actual paper choice where available).
 *           Both must be set; they do not change the page box. For pages
 *           WITHOUT running header/footer slots.
 *   margin  — printable inset on every page of a FLOWING document
 *           (default 0.75in); margin="0" makes pages full-bleed.
 *           Explicitly paginated pages are always full-bleed.
 *
 * Running header/footer (flowing documents only): give an element
 * `slot="header"` or `slot="footer"` and it repeats on every printed
 * page via `position: fixed`. To keep body text from sliding under it,
 * the component prints inside a single-cell table whose <thead>/<tfoot>
 * are spacers sized to the header/footer height — browsers repeat
 * thead/tfoot on every page, so each sheet's content starts below the
 * header and ends above the footer. On screen the header/footer render
 * once at the top/bottom of the sheet.
 *
 * At print the component injects `@page { margin: 0 }` (which leaves
 * Chrome no margin box to draw its date/URL/page-count header in) and
 * moves the visual margin onto the sheet's own padding. It also marks
 * the document as owning its print CSS (a
 * `meta[name="omelette-owns-print"]` it injects at runtime), so the
 * PDF export never injects page-geometry CSS of its own on top.
 *
 * Print best practices for the content you author:
 * - Multi-column text: use CSS columns (`column-count` +
 *   `column-gap`), never side-by-side flex/grid columns — only real
 *   CSS columns flow and break across pages. `column-span: all` lets
 *   a heading span the columns; `hyphens: auto` (needs `lang` on
 *   the html element) keeps narrow columns readable.
 * - Page breaks in flowing documents: `break-before: page` on an
 *   element that must start a new page (a chapter, an appendix). Add
 *   your own kept-together blocks (callouts, stat tiles, cards) to a
 *   `break-inside: avoid` rule, and keep each one shorter than a page.
 * - Extend `orphans: 3; widows: 3` to any custom text blocks you add
 *   (p and li are covered by default).
 * - Give long tables a <thead> — browsers repeat it on every printed
 *   page.
 * - No `position: fixed`/`sticky` and no viewport units in content:
 *   fixed elements stamp every printed page (running headers/footers go
 *   in the component's slots) and `100vh` mis-sizes at print.
 *
 * Author content as static HTML so the user can click-to-edit any text
 * directly. Do not set width/padding/background on the document body —
 * the component owns the sheet box.
 */
/* END USAGE */

(() => {
  const PAPER = {
    letter: ['8.5in', '11in'],
    a4: ['210mm', '297mm'],
    legal: ['8.5in', '14in']
  };
  const CSS_LENGTH = /^\d+(\.\d+)?(px|in|mm|cm|pt|pc)$/;
  // Unitless "0" is a valid CSS length and the natural way to write
  // margin="0"; normalise it to 0px so max()/calc() (which reject a bare
  // number) keep working.
  const safeLen = (v, fb) => {
    v = (v || '').trim();
    return v === '0' ? '0px' : CSS_LENGTH.test(v) ? v : fb;
  };
  // WebKit (Safari and every iOS browser shell) never repeats a table's
  // thead/tfoot on printed pages (WebKit bug 17205), so the spacer-borne
  // vertical margins of a FLOWING document reach only the first page
  // there. Engine check, not browser check: vendor is 'Apple Computer,
  // Inc.' exactly for WebKit and 'Google Inc.' for Blink.
  const WK_PRINT = /apple/i.test(navigator.vendor || '');
  // CSS length → px number (CSS absolute units are exact: 1in = 96px).
  // Returns NaN for anything safeLen would reject — callers gate on it.
  const PX_PER = {
    px: 1,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    pt: 96 / 72,
    pc: 16
  };
  const toPx = v => {
    const m = /^(\d+(?:\.\d+)?)(px|in|mm|cm|pt|pc)$/.exec((v || '').trim());
    return m ? parseFloat(m[1]) * PX_PER[m[2]] : NaN;
  };
  const stylesheet = `
    :host {
      position: relative;
      display: block;
      /* When the viewport is narrower than the page, grow to wrap the
       * sheet (plus this padding) instead of staying viewport-width, so
       * the desk background and right margin reach the sheet's far edge
       * in the horizontal scroll. */
      min-width: max-content;
      min-height: 100vh;
      background: #f5f5f4;
      padding: 48px 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      --doc-page-w: 8.5in;
      --doc-page-h: 11in;
      --doc-page-margin: 0.75in;
      --doc-hdr-h: 0px;
      --doc-ftr-h: 0px;
      --doc-hdr-pad: 0px;
      --doc-ftr-pad: 0px;
    }
    .sheet {
      width: var(--doc-page-w);
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 2px 10px rgba(20, 20, 19, 0.12);
      border-radius: 7px;
      box-sizing: border-box;
      padding: var(--doc-page-margin);
    }
    .frame { width: 100%; border-collapse: collapse; }
    /* Scaled-fit mode (content-width/content-height): the inner .fit box
     * lays the content out at its authored fixed size and scales it onto
     * the printable area; .fit-box reserves the scaled footprint in flow
     * (transforms don't affect layout) and centers it. Without the mode,
     * both divs are unstyled block pass-throughs. */
    /* Explicit pagination: direct .page children are the pages. The sheet
     * becomes a transparent stack and each page carries the card look on
     * screen; at print each page is exactly one full-bleed sheet. The
     * ::slotted defaults are deliberately weak (document CSS wins), so
     * authored page styling can override any of this. */
    .sheet.paginated {
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
    .paginated ::slotted(.page) {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: var(--doc-page-ar);
      container-type: size;
      overflow: hidden;
      box-sizing: border-box;
      background: #fff;
      border-radius: 7px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
      break-inside: avoid;
    }
    .paginated ::slotted(.page:not(:first-child)) { margin-top: 1rem; }
    @media print {
      .sheet.paginated { padding: 0; }
      /* The flowing-document vertical inset lives on the repeating
       * thead/tfoot spacers, not the sheet padding — they must go too,
       * or each full-sheet .page is pushed ~margin down and spills onto
       * a second sheet. Paginated pages are full-bleed by definition
       * (content owns its insets). */
      .sheet.paginated .hdr-space,
      .sheet.paginated .ftr-space { height: 0; }
      .paginated ::slotted(.page) {
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        /* Physical page-box sizing, no viewport units: Safari resolves
         * 100vh against the window, not the page box, so a vh-sized card
         * paginates wrong there. --doc-page-w/h are the named size by
         * default and are overridden to the user's chosen paper by the
         * export path, so every card is exactly one sheet either way.
         * Width + height (same source values as @page size) rather than
         * width + aspect-ratio: the ratio is a 6-decimal rounding of the
         * same division, and a few millionths of overflow would spill a
         * blank sheet after every page. The screen-only aspect-ratio
         * (preview proportions) must not leak into print. cqh typography
         * tracks the same box.
         *
         * Every declaration is !important: per CSS Scoping, unimportant
         * shadow ::slotted rules LOSE to the document context, so a page
         * section's authored inline style would silently beat this print
         * geometry. A model-authored height:100% did exactly that — the
         * percentage resolves as auto in the all-auto print ancestry, the
         * base rule's size containment turns auto into ZERO, and
         * overflow:hidden then paints nothing: a blank PDF with perfect
         * page boxes. At print the component's geometry is the design's
         * whole contract, so it must win over any authored sizing. */
        aspect-ratio: auto !important;
        width: var(--doc-page-w) !important;
        height: var(--doc-page-h) !important;
        overflow: hidden !important;
      }
      .paginated ::slotted(.page:not(:first-child)) {
        break-before: page !important;
        margin-top: 0 !important;
      }
    }
    .fit-mode .fit-box {
      width: calc(var(--doc-fit-w) * var(--doc-fit-scale));
      height: calc(var(--doc-fit-h) * var(--doc-fit-scale));
      margin: 0 auto;
      break-inside: avoid;
    }
    /* Monolithic at print: Blink slices a transform-scaled child at
     * fragmentainer boundaries mapped in UNSCALED layout coordinates
     * (transforms are paint-time), so the .fit box (authored size, e.g.
     * 1400x990) gets cut at the page's free block space and spills onto
     * a second sheet even though its SCALED footprint fits the page by
     * construction. overflow:hidden makes .fit-box a scroll container —
     * monolithic under fragmentation (css-break-3) — so the scaled
     * content prints atomically on one sheet. No clipping for content
     * within the authored box: .fit-box is calc-sized to exactly the
     * scaled footprint. (Content that bleeds past content-width/height
     * is clipped at the footprint — fit mode's contract; it previously
     * painted beyond it at print.) Print-only, so the screen rendering
     * keeps visible overflow for editor affordances.
     * The export path injects the same rule into frozen copies
     * (print-eval.ts om-print-fit-contain). The .fit-mode scope is
     * load-bearing: .fit-box wraps slotted content in EVERY mode, and an
     * unscoped overflow:hidden would make whole flowing documents
     * monolithic (one truncated sheet). overflow:hidden, never clip —
     * clip is not a scroll container, so not monolithic. */
    @media print {
      .fit-mode .fit-box { overflow: hidden; }
    }
    .fit-mode .fit {
      width: var(--doc-fit-w);
      height: var(--doc-fit-h);
      transform: scale(var(--doc-fit-scale));
      transform-origin: top left;
    }
    .frame td, .frame th { padding: 0; text-align: left; font-weight: inherit; }
    .hdr-space { height: var(--doc-hdr-h); }
    .ftr-space { height: var(--doc-ftr-h); }
    ::slotted([slot="header"]),
    ::slotted([slot="footer"]) { display: block; box-sizing: border-box; }
    @media print {
      :host { background: none; padding: 0; min-width: 0; min-height: 0; }
      .sheet {
        width: auto; margin: 0; box-shadow: none; border-radius: 0;
        padding: 0 var(--doc-page-margin);
      }
      /* The thead/tfoot spacers repeat on every page, so they carry the
       * vertical page margin (which the sheet's own padding cannot, since
       * that padding is consumed once on the first/last page). The running
       * header/footer are fixed inside that band. */
      /* The 0.35in is breathing room between a running header/footer and
       * the body; without one the spacer is exactly the page margin, so a
       * margin="0" full-bleed document gets truly full-bleed pages. */
      .hdr-space { height: max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))); }
      .ftr-space { height: max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))); }
      /* WebKit flowing documents: @page carries the vertical margin (see
       * _syncPrintPageRule), so the spacers keep only whatever a running
       * header/footer needs BEYOND it — page 1 would otherwise double its
       * top inset. Paginated sheets already zero their spacers above. */
      .sheet.wk-print:not(.paginated) .hdr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))) - var(--doc-page-margin))); }
      .sheet.wk-print:not(.paginated) .ftr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))) - var(--doc-page-margin))); }
      ::slotted([slot="header"]) {
        position: fixed; top: 0; left: 0; right: 0; margin: 0;
        padding: calc(var(--doc-page-margin) * 0.45) var(--doc-page-margin) 0;
      }
      ::slotted([slot="footer"]) {
        position: fixed; bottom: 0; left: 0; right: 0; margin: 0;
        padding: 0 var(--doc-page-margin) calc(var(--doc-page-margin) * 0.45);
      }
    }
  `;
  class DocPage extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'width', 'height', 'margin', 'orientation', 'content-width', 'content-height'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._mo = typeof MutationObserver === 'function' ? new MutationObserver(() => this._scheduleMeasure()) : null;
    }

    /** The named paper's [w, h], swapped when orientation="landscape".
     *  Only the named size swaps — explicit width/height are exact values
     *  the author already oriented. */
    _paperSize() {
      const named = PAPER[(this.getAttribute('size') || '').toLowerCase()] || PAPER.letter;
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? [named[1], named[0]] : named;
    }
    get pageWidth() {
      return safeLen(this.getAttribute('width'), this._paperSize()[0]);
    }
    get pageHeight() {
      return safeLen(this.getAttribute('height'), this._paperSize()[1]);
    }
    get pageMargin() {
      return safeLen(this.getAttribute('margin'), '0.75in');
    }

    /** Scaled-fit mode's content box [w, h] as CSS lengths, or null when
     *  the mode is off (either attribute missing/invalid/zero — a partial
     *  declaration falls back to normal flow rather than guessing). */
    _contentFit() {
      const w = safeLen(this.getAttribute('content-width'), null);
      const h = safeLen(this.getAttribute('content-height'), null);
      if (!w || !h) return null;
      const wPx = toPx(w),
        hPx = toPx(h);
      return wPx > 0 && hPx > 0 ? [w, h, wPx, hPx] : null;
    }
    connectedCallback() {
      if (!this._sheet) this._render();
      this._syncSize();
      this._syncPrintPageRule();
      this._ensureTextWrapDefaults();
      this._ensureOwnsPrintMeta();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      if (this._mo) this._mo.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      this._onResize = () => this._scheduleMeasure();
      window.addEventListener('resize', this._onResize);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this._scheduleMeasure());
      }
      this._scheduleMeasure();
    }
    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      if (this._mo) this._mo.disconnect();
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      // Drop the head rules when the last doc-page leaves, so a deleted
      // document's @page geometry and text-wrap defaults can't apply to
      // whatever replaces it.
      const survivor = document.querySelector('doc-page');
      if (!survivor) {
        ['doc-page-print', 'doc-page-text-wrap', 'doc-page-owns-print', 'doc-page-fixed-size', 'doc-page-print-sizing'].forEach(id => {
          const tag = document.getElementById(id);
          if (tag) tag.remove();
        });
        // A live deck-stage deferred its own print-sizing meta to ours —
        // hand the page-global meta over so the deck isn't left unmarked.
        const deck = document.querySelector('deck-stage');
        if (deck && typeof deck._ensurePrintSizingMeta === 'function') {
          deck._ensurePrintSizingMeta();
        }
      } else {
        // A departed owner hands each page-global meta to whatever
        // doc-page remains (or it's removed).
        if (typeof survivor._syncFixedSizeMeta === 'function') {
          survivor._syncFixedSizeMeta();
        }
        if (typeof survivor._syncPrintSizingMeta === 'function') {
          survivor._syncPrintSizingMeta();
        }
      }
    }
    attributeChangedCallback() {
      if (!this._sheet) return;
      this._syncSize();
      this._syncPrintPageRule();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      this._scheduleMeasure();
    }
    _render() {
      this._root.innerHTML = `
        <style>${stylesheet}</style>
        <style id="vars"></style>
        <div class="sheet" data-screen-label="Document">
          <table class="frame" role="presentation">
            <thead><tr><th><div class="hdr-space"><slot name="header"></slot></div></th></tr></thead>
            <tbody><tr><td class="body"><div class="fit-box"><div class="fit"><slot></slot></div></div></td></tr></tbody>
            <tfoot><tr><td><div class="ftr-space"><slot name="footer"></slot></div></td></tr></tfoot>
          </table>
        </div>`;
      this._sheet = this._root.querySelector('.sheet');
      this._vars = this._root.getElementById('vars');
    }

    /** Runtime sizing lives in a shadow <style> :host rule, never on the
     *  light-DOM host element, so serialize-persist can't write it back. */
    _syncSize(hdrH, ftrH) {
      // Scaled-fit mode: content at its authored size, scaled onto the
      // printable area (page minus margins on both axes). The factor is a
      // plain number var so calc(length * number) stays valid; 4 decimals
      // keeps the shadow style stable across re-measures. Upscaling is
      // allowed — print transforms are vector, so text and CSS stay crisp
      // (raster images soften, which the catalog bullet warns about).
      const fit = this._contentFit();
      let fitVars = '';
      if (fit) {
        const marginPx = toPx(this.pageMargin) || 0;
        const availW = toPx(this.pageWidth) - 2 * marginPx;
        const availH = toPx(this.pageHeight) - 2 * marginPx;
        const scale = Math.min(availW / fit[2], availH / fit[3]);
        if (scale > 0 && Number.isFinite(scale)) {
          fitVars = '--doc-fit-w:' + fit[0] + ';' + '--doc-fit-h:' + fit[1] + ';' + '--doc-fit-scale:' + scale.toFixed(4) + ';';
        }
      }
      this._sheet.classList.toggle('fit-mode', !!fitVars);
      // Numeric w/h ratio for the paginated page cards' aspect-ratio —
      // aspect-ratio takes a number, not a length ratio, so compute it
      // here (CSS length division isn't portable). 6 decimals keeps the
      // shadow style stable across re-syncs.
      const arW = toPx(this.pageWidth);
      const arH = toPx(this.pageHeight);
      const ar = arW > 0 && arH > 0 ? (arW / arH).toFixed(6) : '0.772727';
      this._vars.textContent = ':host{' + fitVars + '--doc-page-ar:' + ar + ';' + '--doc-page-w:' + this.pageWidth + ';' + '--doc-page-h:' + this.pageHeight + ';' + '--doc-page-margin:' + this.pageMargin + ';' + '--doc-hdr-h:' + (hdrH || 0) + 'px;' + '--doc-ftr-h:' + (ftrH || 0) + 'px;' + '--doc-hdr-pad:' + (hdrH ? '0.35in' : '0px') + ';' + '--doc-ftr-pad:' + (ftrH ? '0.35in' : '0px') + '}';
    }

    /** @page is a no-op inside shadow DOM, so the rule lives in <head>.
     *  Re-appended on every sync so it stays last in source order — the
     *  @page cascade is source-order per descriptor, so this rule wins
     *  over any other @page rule in the document.
     *
     *  The @page SIZE is pinned where the page box IS part of the design:
     *  explicit-fixed-size mode (width + height authored), scaled-fit
     *  mode (the named sheet the fit targets), and explicit pagination
     *  (the named size the cards share — so card and sheet agree on
     *  every print path, and the export path's chosen paper overrides
     *  BOTH with one later rule). For FLOWING documents no paper size is
     *  emitted at all — the true size comes from the user's preference,
     *  injected by the export path or chosen in the print dialog — so a
     *  flowing document never fights the paper it lands on.
     *  margin: 0 is emitted in every mode: it leaves Chrome no margin box
     *  to draw its date/URL/page-count header in, and the visual margin
     *  lives on the sheet's own padding. */
    _syncPrintPageRule() {
      const id = 'doc-page-print';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
      }
      document.head.appendChild(tag);
      // Three print-geometry regimes:
      // - true-size: the page IS the design — pin its exact size.
      // - scaled-fit (content-width/height): the fit factor is computed
      //   against the NAMED paper's printable area, so that paper must
      //   stay pinned or the scaled content overflows a smaller sheet
      //   (the export path re-fits and re-pins at print time on top).
      // - default modes: no paper size — but landscape still needs the
      //   paper-agnostic 'size: landscape' keyword, because the size
      //   descriptor is what carries orientation; without it a landscape
      //   document prints portrait whenever nothing injects a size.
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      // Explicit pagination pins the page box to the SAME values that
      // size the cards (the named size by default, the export path's
      // chosen paper when its later rule overrides both) — card and
      // sheet agree on every print path, and a mismatched real paper
      // shrinks-to-fit in the dialog instead of clipping a Letter card
      // on A4. Declared before the paginated read below so both derive
      // from one check.
      const paginatedNow = this.querySelector(':scope > .page') !== null;
      const sizeDescriptor = this._trueSizePx() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : this._contentFit() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : paginatedNow ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : landscape ? 'size: landscape; ' : '';
      // WebKit never repeats the thead/tfoot spacers that carry a flowing
      // document's vertical page margins (see WK_PRINT above), so pages
      // after the first print edge-to-edge there. Carry the VERTICAL
      // margins on @page for WebKit instead, and the shadow print CSS
      // trims the first-page spacers by the same amount (.sheet.wk-print
      // rules). Horizontal inset stays on the sheet's own padding in
      // every engine. Blink keeps margin: 0 (a nonzero margin there
      // re-opens the box Chrome draws its header furniture in). One cost,
      // learned in testing: Safari's own date/URL headers are a USER
      // dialog setting ("Print headers and footers") that renders in the
      // margin area when room exists — margin: 0 only suppressed it by
      // leaving no room, and no CSS controls it. The export dialog's
      // Safari guide teaches turning the setting off for flowing
      // documents. Explicitly paginated and fixed-size documents keep
      // margin: 0 everywhere: their pages ARE the sheet.
      const wkFlowing = WK_PRINT && !paginatedNow && !this._trueSizePx() && !this._contentFit();
      const marginDescriptor = wkFlowing ? 'margin: ' + this.pageMargin + ' 0; ' : 'margin: 0; ';
      // Shadow-internal marker (never serialized), kept in lockstep with
      // the @page decision above: the print CSS trims the first-page
      // spacers ONLY while @page actually carries the margins — a
      // true-size or scaled-fit sheet keeps margin: 0 and must keep its
      // spacers too. Re-synced here so attribute changes and pagination
      // flips move both together.
      if (this._sheet) this._sheet.classList.toggle('wk-print', wkFlowing);
      tag.textContent = '@page { ' + sizeDescriptor + marginDescriptor + '} ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; height: auto !important; overflow: visible !important; } ' + 'h1,h2,h3,h4,h5,h6 { break-after: avoid; } ' + 'figure,pre,blockquote,img,svg,tr { break-inside: avoid; } ' + 'p,li { orphans: 3; widows: 3; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; ' + 'backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } ' + '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }

    /** Typographic defaults for document text: balance headings, avoid
     *  widowed/orphaned words in body copy (browsers without text-wrap
     *  support drop the declarations). Zero-specificity via :where() so
     *  any text-wrap authored on those elements wins; document-level so the
     *  rules reach the slotted (light DOM) content — shadow styles can't.
     *  data-omelette-injected marks the tag for the host editor to strip
     *  at serialize, so it is never written back as authored source. */
    _ensureTextWrapDefaults() {
      if (document.getElementById('doc-page-text-wrap')) return;
      const tag = document.createElement('style');
      tag.id = 'doc-page-text-wrap';
      tag.setAttribute('data-omelette-injected', '');
      tag.textContent = ':where(h1,h2,h3,h4,h5,h6){text-wrap:balance}' + ':where(p,li,blockquote,figcaption){text-wrap:pretty}';
      document.head.appendChild(tag);
    }

    /** Declares that this document owns its print CSS. The instant-PDF
     *  export checks for the meta by NAME PRESENCE alone (content is
     *  ignored) and skips its automatic print-CSS injections, so the
     *  component's @page geometry is never overridden by a heuristic.
     *  data-omelette-injected keeps it out of serialized source. */
    _ensureOwnsPrintMeta() {
      if (document.getElementById('doc-page-owns-print')) return;
      const tag = document.createElement('meta');
      tag.id = 'doc-page-owns-print';
      tag.name = 'omelette-owns-print';
      tag.content = 'true';
      tag.setAttribute('data-omelette-injected', '');
      document.head.appendChild(tag);
    }

    /** This page's valid true-size page box (explicit width AND height)
     *  as [w, h] px ints, or null when the mode is off. */
    _trueSizePx() {
      if (!safeLen(this.getAttribute('width'), null) || !safeLen(this.getAttribute('height'), null)) return null;
      const w = Math.round(toPx(this.pageWidth));
      const h = Math.round(toPx(this.pageHeight));
      return w > 0 && h > 0 ? [w, h] : null;
    }

    /** True-size pages (explicit width AND height) also declare the page
     *  box as the preview size: the in-app preview reads
     *  meta[name="omelette-fixed-size"] (content "W,H" in px ints) and
     *  scales the sheet into view — without it an 18in poster previews at
     *  true size with scrollbars. Never overrides an author-set meta
     *  (only the component's own id is managed). The meta is page-global
     *  while doc-page instances are not, so every sync recomputes the
     *  page-wide owner — the first connected true-size doc-page — and a
     *  non-true-size sibling's sync can never delete the owner's meta.
     *  Removed when no true-size page remains (the owner's disconnect
     *  re-syncs via any survivor) or when an author-set meta exists. */
    _syncFixedSizeMeta() {
      const id = 'doc-page-fixed-size';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-fixed-size"]:not([data-omelette-injected])');
      // The page-wide owner, not this instance: an upgraded true-size page
      // anywhere in the document keeps the meta alive and sized.
      let box = null;
      for (const el of document.querySelectorAll('doc-page')) {
        box = typeof el._trueSizePx === 'function' ? el._trueSizePx() : null;
        if (box) break;
      }
      if (!box || authored) {
        if (own) own.remove();
        return;
      }
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-fixed-size';
      tag.content = box[0] + ',' + box[1];
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }

    /** This page's print-sizing mode: 'fixed' when an explicit width AND
     *  height are authored (the page is the design's own size), else the
     *  default paper in the authored orientation. */
    _printSizingMode() {
      if (this._trueSizePx()) return 'fixed';
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? 'default-landscape' : 'default-portrait';
    }

    /** Announces the print-sizing mode to the host app:
     *  meta[name="omelette-print-sizing"] with content 'default-portrait',
     *  'default-landscape', or 'fixed' (fixed pages also carry the
     *  omelette-fixed-size meta with the page box in px). The export path
     *  probes it to decide what true paper size to inject at print time —
     *  in the default modes the component emits no paper size of its own.
     *  Same page-global ownership rules as the fixed-size meta above:
     *  first connected doc-page owns it, an authored meta is never
     *  overridden, removed when no doc-page remains. */
    _syncPrintSizingMeta() {
      const id = 'doc-page-print-sizing';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-print-sizing"]:not([data-omelette-injected])');
      // A fixed page wins outright (mirroring the fixed-size loop above,
      // so the two metas can never contradict each other in a mixed
      // multi-page document); otherwise the first page's mode holds.
      let mode = null;
      for (const el of document.querySelectorAll('doc-page')) {
        if (typeof el._printSizingMode !== 'function') continue;
        const m = el._printSizingMode();
        if (m === 'fixed') {
          mode = m;
          break;
        }
        if (mode === null) mode = m;
      }
      if (!mode || authored) {
        if (own) own.remove();
        return;
      }
      // A deck-stage that connected first injected its own meta and
      // defers to any existing one — take it over, or the document ends
      // up with two conflicting injected metas (a doc-page page is the
      // document; the deck re-ensures its meta if every doc-page leaves).
      const deckMeta = document.getElementById('deck-stage-print-sizing');
      if (deckMeta) deckMeta.remove();
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-print-sizing';
      tag.content = mode;
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }
    _scheduleMeasure() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._measure();
      });
    }

    /** Slot heights feed the print spacers (--doc-hdr-h / --doc-ftr-h), so
     *  they re-measure on content mutation, resize, and font load. The
     *  same pass detects explicit pagination (direct .page children) and
     *  toggles the sheet between the flowing-document card and the
     *  page-per-card stack — content edits can add or remove pages at any
     *  time, so this tracks the same mutations the measurement does. */
    _measure() {
      const hdr = this.querySelector(':scope > [slot="header"]');
      const ftr = this.querySelector(':scope > [slot="footer"]');
      const wasPaginated = this._sheet.classList.contains('paginated');
      this._sheet.classList.toggle('paginated', this.querySelector(':scope > .page') !== null);
      // The WebKit @page margin is flowing-only, so a pagination flip
      // must re-emit the rule (content edits can add or remove .page
      // sections at any time).
      if (this._sheet.classList.contains('paginated') !== wasPaginated) {
        this._syncPrintPageRule();
      }
      this._syncSize(hdr ? hdr.offsetHeight : 0, ftr ? ftr.offsetHeight : 0);
    }
  }
  if (!customElements.get('doc-page')) {
    customElements.define('doc-page', DocPage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "doc-page.js", error: String((e && e.message) || e) }); }

// ui_kits/admin/AdminApp.jsx
try { (() => {
const admSame = (a, b) => (a || null) === (b || null);
function admApplyWeb(products, items, sign) {
  return products.map(p => {
    const its = items.filter(i => i.name === p.name);
    if (!its.length) return p;
    return {
      ...p,
      variants: p.variants.map(v => {
        const d = its.filter(i => admSame(i.model, v.model) && admSame(i.color, v.color)).reduce((s, i) => s + i.qty, 0);
        return d ? {
          ...v,
          stock: Math.max(0, v.stock + sign * d)
        } : v;
      })
    };
  });
}
function admWebSale(o, products, at) {
  return {
    id: 'sw' + o.id,
    date: at || o.paidAt || new Date().toISOString(),
    status: 'ok',
    voidReason: null,
    method: 'transferencia',
    channel: 'web',
    webId: o.id,
    discountPct: 0,
    subtotal: o.total,
    discount: 0,
    total: o.total,
    items: o.items.map(i => {
      const p = products.find(x => x.name === i.name);
      const v = p && p.variants.find(y => admSame(y.model, i.model) && admSame(y.color, i.color));
      return {
        ...i,
        pid: p ? p.id : null,
        vid: v ? v.id : null
      };
    })
  };
}
function AdminApp() {
  const dk = !!window.ADM_DESKTOP;
  const K = dk ? '-dk' : '';
  const D = window.ADM_DATA;
  const [authed, setAuthed] = React.useState(() => localStorage.getItem('lf-adm-auth' + K) === '1');
  const [tab, setTabS] = React.useState(() => localStorage.getItem('lf-adm-tab' + K) || 'ventas');
  const R = window.LF_RES;
  const [web, setWeb] = React.useState(() => R.all());
  const [products, setProducts] = React.useState(() => admApplyWeb(D.products, web.filter(o => o.status !== 'cancelada').flatMap(o => o.items), -1));
  const [sales, setSales] = React.useState(() => [...D.sales, ...web.filter(o => o.status === 'pagada').map(o => admWebSale(o, D.products))]);
  const seen = React.useRef(new Set(web.map(o => o.id)));
  React.useEffect(() => R.subscribe(list => {
    const fresh = list.filter(o => !seen.current.has(o.id));
    fresh.forEach(o => seen.current.add(o.id));
    if (fresh.length) setProducts(ps => admApplyWeb(ps, fresh.flatMap(o => o.items), -1));
    setWeb(list);
  }), []);
  const markPaid = id => {
    const at = new Date().toISOString();
    const o = web.find(x => x.id === id);
    R.save(R.all().map(x => x.id === id ? {
      ...x,
      status: 'pagada',
      paidAt: at
    } : x));
    setSales(x => [admWebSale({
      ...o,
      paidAt: at
    }, products, at), ...x]);
  };
  const cancelWeb = (id, reason) => {
    const o = web.find(x => x.id === id);
    R.save(R.all().map(x => x.id === id ? {
      ...x,
      status: 'cancelada',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason
    } : x));
    setProducts(ps => admApplyWeb(ps, o.items, 1));
    return o.items.reduce((s, i) => s + i.qty, 0);
  };
  const [suppliers, setSuppliers] = React.useState(D.suppliers);
  const [focus, setFocus] = React.useState(null);
  const [catNotice, setCatNotice] = React.useState(null);
  const setTab = t => {
    setTabS(t);
    localStorage.setItem('lf-adm-tab' + K, t);
    window.scrollTo(0, 0);
  };
  const bump = changes => setProducts(ps => ps.map(p => ({
    ...p,
    variants: p.variants.map(v => {
      const d = changes.filter(c => c.vid === v.id).reduce((s, c) => s + c.delta, 0);
      return d ? {
        ...v,
        stock: Math.max(0, v.stock + d)
      } : v;
    })
  })));
  const confirmSale = s => {
    const sale = {
      id: 's' + Date.now(),
      date: new Date().toISOString(),
      status: 'ok',
      voidReason: null,
      method: s.method,
      discountPct: s.discountPct,
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      items: s.items.map(i => ({
        pid: i.pid,
        vid: i.vid,
        name: i.name,
        model: i.model,
        color: i.color,
        qty: i.qty,
        price: i.price
      }))
    };
    setSales(x => [sale, ...x]);
    bump(s.items.map(i => ({
      vid: i.vid,
      delta: -i.qty
    })));
    return sale;
  };
  const voidSale = (id, reason) => {
    const s = sales.find(x => x.id === id);
    setSales(x => x.map(y => y.id === id ? {
      ...y,
      status: 'anulada',
      voidReason: reason,
      voidedAt: new Date().toISOString()
    } : y));
    bump(s.items.map(i => ({
      vid: i.vid,
      delta: i.qty
    })));
    return s.items.reduce((a, i) => a + i.qty, 0);
  };
  const createSupplier = (name, contact) => {
    const s = {
      id: 'sp' + Date.now(),
      name,
      contact
    };
    setSuppliers(x => [...x, s]);
    return s;
  };
  const purchase = items => bump(items.map(i => ({
    vid: i.vid,
    delta: i.qty
  })));
  const createProduct = p => {
    setProducts(ps => [p, ...ps]);
    setFocus(p.id);
    setCatNotice(`“${p.name}” creado con ${p.variants.length} ${p.variants.length === 1 ? 'variante' : 'variantes'}. Sumale fotos para que se vea en la web.`);
    setTab('catalogo');
  };
  if (!authed) return /*#__PURE__*/React.createElement(LoginScreen, {
    dk: dk,
    onLogin: () => {
      setAuthed(true);
      localStorage.setItem('lf-adm-auth' + K, '1');
    }
  });
  let body;
  if (tab === 'web') body = /*#__PURE__*/React.createElement(WebVentasScreen, {
    dk: dk,
    orders: web,
    onPaid: markPaid,
    onCancel: cancelWeb
  });else if (tab === 'historial') body = /*#__PURE__*/React.createElement(HistorialScreen, {
    dk: dk,
    sales: sales,
    onVoid: voidSale
  });else if (tab === 'catalogo') body = /*#__PURE__*/React.createElement(CatalogoScreen, {
    key: focus || 'cat',
    dk: dk,
    products: products,
    setProducts: setProducts,
    focusId: focus,
    notice: catNotice,
    clearNotice: () => setCatNotice(null)
  });else if (tab === 'compras') body = /*#__PURE__*/React.createElement(ComprasScreen, {
    dk: dk,
    products: products,
    suppliers: suppliers,
    onCreateSupplier: createSupplier,
    onPurchase: purchase
  });else if (tab === 'nuevo') body = /*#__PURE__*/React.createElement(NuevoProductoScreen, {
    dk: dk,
    categories: D.categories,
    onCreate: createProduct
  });else body = /*#__PURE__*/React.createElement(VentasScreen, {
    dk: dk,
    products: products,
    onConfirm: confirmSale
  });
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": tab
  }, /*#__PURE__*/React.createElement(AdminShell, {
    dk: dk,
    badges: {
      web: web.filter(o => o.status === 'pendiente').length
    },
    tab: tab,
    onTab: t => {
      if (t !== 'catalogo') {
        setFocus(null);
        setCatNotice(null);
      }
      setTab(t);
    },
    onLogout: () => {
      setAuthed(false);
      localStorage.removeItem('lf-adm-auth' + K);
    }
  }, body));
}
ReactDOM.createRoot(document.getElementById('app')).render(/*#__PURE__*/React.createElement(AdminApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AdminApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AdminShell.jsx
try { (() => {
const ADM_TABS = [{
  key: 'ventas',
  label: 'Ventas',
  icon: 'ShoppingCart'
}, {
  key: 'web',
  label: 'Web',
  long: 'Ventas web',
  icon: 'Globe'
}, {
  key: 'historial',
  label: 'Historial',
  icon: 'ReceiptText'
}, {
  key: 'compras',
  label: 'Compras',
  icon: 'Truck'
}, {
  key: 'nuevo',
  label: 'Nuevo',
  long: 'Nuevo producto',
  icon: 'PackagePlus'
}, {
  key: 'catalogo',
  label: 'Catálogo',
  icon: 'Package'
}];
const admDot = (n, dk) => n ? /*#__PURE__*/React.createElement("span", {
  style: {
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 9,
    background: 'var(--admin-danger)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(dk ? {} : {
      position: 'absolute',
      top: -6,
      right: -10
    })
  }
}, n) : null;
function AdminShell({
  dk,
  tab,
  onTab,
  onLogout,
  badges,
  children
}) {
  const {
    Logo
  } = window.LaFunditaDesignSystem_371b6e;
  const logo = '../../assets/logo-black.jpg';
  if (dk) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        background: 'var(--admin-bg)'
      }
    }, /*#__PURE__*/React.createElement("header", {
      style: {
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--admin-ink)',
        height: 'var(--header-h-admin)',
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        padding: '0 32px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Logo, {
      crop: true,
      size: 50,
      src: logo
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...admS.cap,
        color: 'rgb(255 255 255 / .6)'
      }
    }, "Panel")), /*#__PURE__*/React.createElement("nav", {
      "aria-label": "Panel",
      style: {
        display: 'flex',
        gap: 4,
        flex: 1
      }
    }, ADM_TABS.map(t => {
      const on = t.key === tab;
      return /*#__PURE__*/React.createElement("button", {
        key: t.key,
        type: "button",
        "aria-current": on ? 'page' : undefined,
        onClick: () => onTab(t.key),
        style: {
          height: 40,
          padding: '0 16px',
          borderRadius: 'var(--admin-radius)',
          border: 0,
          background: on ? '#fff' : 'transparent',
          color: on ? '#000' : 'rgb(255 255 255 / .78)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: t.icon,
        size: 18
      }), t.long || t.label, admDot(badges && badges[t.key], true));
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onLogout,
      style: {
        height: 40,
        padding: '0 12px',
        borderRadius: 'var(--admin-radius)',
        border: 0,
        background: 'transparent',
        color: 'rgb(255 255 255 / .78)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "LogOut",
      size: 18
    }), "Salir")), /*#__PURE__*/React.createElement("main", {
      style: {
        maxWidth: 1240,
        margin: '0 auto',
        padding: '32px 32px 72px',
        boxSizing: 'border-box'
      }
    }, children));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--admin-bg)',
      paddingBottom: 'calc(var(--admin-nav-h) + 24px)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: 'var(--admin-ink)',
      height: 'var(--admin-topbar-h)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px 0 16px'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    crop: true,
    size: 42,
    src: logo
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onLogout,
    "aria-label": "Cerrar sesi\xF3n",
    title: "Cerrar sesi\xF3n",
    style: {
      width: 44,
      height: 44,
      border: 0,
      background: 'transparent',
      color: 'rgb(255 255 255 / .78)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "LogOut",
    size: 20
  }))), /*#__PURE__*/React.createElement("main", {
    style: {
      padding: '20px 16px 8px'
    }
  }, children), /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Panel",
    style: {
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(100%, 430px)',
      zIndex: 40,
      background: '#fff',
      borderTop: '1px solid var(--admin-border)',
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      height: 'var(--admin-nav-h)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }
  }, ADM_TABS.map(t => {
    const on = t.key === tab;
    return /*#__PURE__*/React.createElement("button", {
      key: t.key,
      type: "button",
      "aria-current": on ? 'page' : undefined,
      onClick: () => onTab(t.key),
      style: {
        position: 'relative',
        border: 0,
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        color: on ? 'var(--admin-ink)' : 'var(--admin-muted)',
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: on ? 700 : 500,
        cursor: 'pointer',
        padding: 0
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 0,
        left: '22%',
        right: '22%',
        height: 3,
        background: 'var(--admin-ink)',
        borderRadius: '0 0 2px 2px'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 22,
      stroke: on ? 2.1 : 1.75
    }), admDot(badges && badges[t.key], false)), t.label);
  })));
}
function LoginScreen({
  dk,
  onLogin
}) {
  const {
    Logo
  } = window.LaFunditaDesignSystem_371b6e;
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const submit = e => {
    e && e.preventDefault();
    if (!email.includes('@') || pass.length < 4) {
      setError('Email o contraseña incorrectos.');
      return;
    }
    setBusy(true);
    setTimeout(() => onLogin(), 500);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: dk ? 'var(--admin-bg)' : '#fff',
      display: 'flex',
      alignItems: dk ? 'center' : 'stretch',
      justifyContent: 'center',
      padding: dk ? 24 : 0,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: dk ? 440 : undefined,
      background: '#fff',
      border: dk ? '1px solid var(--admin-border)' : 0,
      borderRadius: dk ? 8 : 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--admin-ink)',
      padding: dk ? '28px 32px' : '48px 20px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    crop: true,
    size: dk ? 96 : 112,
    src: "../../assets/logo-black.jpg"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.cap,
      color: 'rgb(255 255 255 / .6)'
    }
  }, "Panel de administraci\xF3n")), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    style: {
      padding: dk ? 32 : '28px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'var(--admin-title)',
      letterSpacing: '-.02em',
      color: 'var(--admin-text)'
    }
  }, "Acceso al panel"), /*#__PURE__*/React.createElement("p", {
    style: {
      ...admS.muted,
      margin: '4px 0 0',
      fontSize: 14
    }
  }, "Ingres\xE1 con tu cuenta de administrador.")), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    htmlFor: "adm-email"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "adm-email",
    type: "email",
    value: email,
    onChange: v => {
      setEmail(v);
      setError(null);
    },
    placeholder: "admin@lafundita.com",
    inputMode: "email"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Contrase\xF1a",
    htmlFor: "adm-pass"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "adm-pass",
    type: show ? 'text' : 'password',
    value: pass,
    onChange: v => {
      setPass(v);
      setError(null);
    },
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    onEnter: submit
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 2,
      top: 2
    }
  }, /*#__PURE__*/React.createElement(IconBtn, {
    icon: show ? 'EyeOff' : 'Eye',
    label: show ? 'Ocultar contraseña' : 'Mostrar contraseña',
    onClick: () => setShow(!show)
  })))), error && /*#__PURE__*/React.createElement(Notice, {
    kind: "danger"
  }, error), /*#__PURE__*/React.createElement(Btn, {
    type: "submit",
    size: "lg",
    full: true,
    disabled: busy || !email.trim() || !pass
  }, busy ? 'Entrando…' : 'Entrar'))));
}
Object.assign(window, {
  AdminShell,
  LoginScreen,
  ADM_TABS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AdminShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/CatalogoScreen.jsx
try { (() => {
function NameEditor({
  value,
  onSave
}) {
  const [t, setT] = React.useState(value);
  const [ok, setOk] = React.useState(false);
  React.useEffect(() => setT(value), [value]);
  const dirty = t.trim() && t.trim() !== value;
  const save = () => {
    if (!dirty) return;
    onSave(t.trim());
    setOk(true);
    setTimeout(() => setOk(false), 1200);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Input, {
    value: t,
    onChange: setT,
    onEnter: save,
    state: ok ? 'ok' : dirty ? 'dirty' : null,
    ariaLabel: "Nombre del producto",
    style: {
      flex: 1
    }
  }), dirty && /*#__PURE__*/React.createElement(Btn, {
    onClick: save
  }, "Guardar"), ok && !dirty && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: 'var(--admin-ok)',
      ...admS.body,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 18
  }), "Guardado"));
}
function GalleryEditor({
  dk,
  images,
  onChange
}) {
  const [sel, setSel] = React.useState(null);
  const [drag, setDrag] = React.useState(null);
  const [over, setOver] = React.useState(false);
  const input = React.useRef(null);
  const addFiles = files => {
    const urls = Array.from(files || []).filter(f => /image\/(jpeg|png|webp)/.test(f.type)).map(f => URL.createObjectURL(f));
    if (urls.length) onChange([...images, ...urls]);
  };
  const move = (from, to) => {
    if (to < 0 || to >= images.length) return;
    const a = [...images];
    const [x] = a.splice(from, 1);
    a.splice(to, 0, x);
    onChange(a);
    setSel(to);
  };
  const remove = i => {
    onChange(images.filter((_, k) => k !== i));
    setSel(null);
  };
  const tile = dk ? 112 : 96;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    onDragOver: e => {
      e.preventDefault();
      if (drag === null) setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: e => {
      e.preventDefault();
      setOver(false);
      if (drag === null) addFiles(e.dataTransfer.files);
    },
    style: {
      display: 'flex',
      gap: 8,
      overflowX: dk ? 'visible' : 'auto',
      flexWrap: dk ? 'wrap' : 'nowrap',
      padding: 4,
      margin: -4,
      borderRadius: 8,
      outline: over ? '2px dashed var(--admin-ink)' : 'none'
    }
  }, images.map((src, i) => /*#__PURE__*/React.createElement("button", {
    key: src + i,
    type: "button",
    draggable: true,
    onDragStart: () => setDrag(i),
    onDragEnd: () => setDrag(null),
    onDragOver: e => e.preventDefault(),
    onDrop: e => {
      e.preventDefault();
      e.stopPropagation();
      if (drag !== null && drag !== i) move(drag, i);
      setDrag(null);
    },
    onClick: () => setSel(sel === i ? null : i),
    "aria-label": `Foto ${i + 1}${i === 0 ? ', principal' : ''}`,
    "aria-pressed": sel === i,
    style: {
      position: 'relative',
      width: tile,
      height: tile,
      flexShrink: 0,
      padding: 0,
      border: 0,
      borderRadius: 4,
      overflow: 'hidden',
      cursor: 'grab',
      outline: sel === i ? '3px solid var(--admin-ink)' : 'none',
      outlineOffset: 2,
      opacity: drag === i ? .4 : 1,
      background: 'var(--admin-border)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    draggable: false,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 6,
      top: 6,
      minWidth: 22,
      height: 22,
      padding: '0 6px',
      borderRadius: 11,
      background: i === 0 ? 'var(--admin-ink)' : 'rgb(255 255 255 / .9)',
      color: i === 0 ? '#fff' : '#000',
      ...admS.mono,
      fontSize: 12,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, i === 0 ? 'Principal' : i + 1))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => input.current && input.current.click(),
    style: {
      width: dk ? 220 : tile,
      height: tile,
      flexShrink: 0,
      border: '2px dashed var(--admin-border-strong)',
      borderRadius: 4,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      cursor: 'pointer',
      color: 'var(--admin-text)',
      padding: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ImagePlus",
    size: 24
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 1.25
    }
  }, dk ? 'Arrastrá fotos o hacé clic' : 'Agregar fotos'), dk && /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.muted,
      fontSize: 12
    }
  }, "JPG, PNG o WEBP \xB7 varias a la vez")), /*#__PURE__*/React.createElement("input", {
    ref: input,
    type: "file",
    multiple: true,
    accept: "image/jpeg,image/png,image/webp",
    style: {
      display: 'none'
    },
    onChange: e => {
      addFiles(e.target.files);
      e.target.value = '';
    }
  })), sel !== null && sel < images.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: "ArrowLeft",
    disabled: sel === 0,
    onClick: () => move(sel, sel - 1)
  }, "Antes"), /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: "ArrowRight",
    disabled: sel === images.length - 1,
    onClick: () => move(sel, sel + 1)
  }, "Despu\xE9s"), /*#__PURE__*/React.createElement(Btn, {
    kind: "dangerOutline",
    icon: "Trash2",
    onClick: () => remove(sel)
  }, "Quitar")) : /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted
    }
  }, images.length ? `La primera es la foto principal en la web. ${dk ? 'Arrastrá para reordenar o hacé' : 'Tocá'} una foto para moverla o quitarla.` : 'Sin fotos: en la web se ve el recuadro vacío.'));
}
function BulkPrice({
  product,
  onApply
}) {
  const {
    fmt
  } = window.ADM;
  const [step, setStep] = React.useState('idle');
  const [t, setT] = React.useState('');
  const [msg, setMsg] = React.useState(null);
  const n = product.variants.length;
  const target = n === 1 ? 'la variante' : `las ${n} variantes`;
  const price = Number(t);
  if (step === 'idle') return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: "Tag",
    full: true,
    onClick: () => {
      setMsg(null);
      setStep('edit');
    }
  }, "Cambiar precio a todos los modelos"), msg && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'var(--admin-ok)',
      ...admS.body,
      fontSize: 14,
      fontWeight: 600
    }
  }, msg));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 16,
      borderRadius: 'var(--admin-radius)',
      background: 'var(--admin-bg)',
      border: '1px solid var(--admin-border)'
    }
  }, step === 'edit' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, {
    label: `Nuevo precio para ${target}`
  }, /*#__PURE__*/React.createElement(Input, {
    value: t,
    onChange: setT,
    digits: true,
    prefix: "$",
    mono: true,
    autoFocus: true,
    placeholder: "0",
    onEnter: () => price > 0 && setStep('confirm')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    onClick: () => {
      setStep('idle');
      setT('');
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement(Btn, {
    disabled: !(price > 0),
    onClick: () => setStep('confirm')
  }, "Continuar"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.body
    }
  }, "Esto cambia el precio de ", target, " de ", /*#__PURE__*/React.createElement("strong", null, product.name), " a ", /*#__PURE__*/React.createElement("strong", {
    style: admS.mono
  }, fmt(price)), ". \xBFConfirm\xE1s?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    onClick: () => setStep('edit')
  }, "Volver"), /*#__PURE__*/React.createElement(Btn, {
    onClick: () => {
      onApply(price);
      setMsg(`Precio actualizado a ${fmt(price)} en ${n === 1 ? '1 variante' : n + ' variantes'}.`);
      setStep('idle');
      setT('');
    }
  }, "S\xED, cambiar"))));
}
function VariantRow({
  dk,
  v,
  onSave,
  first
}) {
  const {
    label
  } = window.ADM;
  const [stock, setStock] = React.useState(String(v.stock));
  const [price, setPrice] = React.useState(String(v.price));
  const [ok, setOk] = React.useState(false);
  React.useEffect(() => {
    setStock(String(v.stock));
    setPrice(String(v.price));
  }, [v.stock, v.price]);
  const valid = stock !== '' && price !== '' && Number(price) > 0;
  const dirty = valid && (Number(stock) !== v.stock || Number(price) !== v.price);
  const save = () => {
    if (!dirty) return;
    onSave({
      stock: Number(stock),
      price: Number(price)
    });
    setOk(true);
    setTimeout(() => setOk(false), 1200);
  };
  const st = (a, b) => ok ? 'ok' : Number(a) !== b && a !== '' ? 'dirty' : null;
  const out = Number(stock) === 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'minmax(0,1fr) 108px 140px 104px' : '1fr 1.25fr',
      gap: 8,
      alignItems: 'center',
      padding: '12px 0',
      borderTop: first ? 0 : '1px solid var(--admin-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: dk ? undefined : '1 / -1',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.body,
      fontWeight: 600
    }
  }, label(v)), out && /*#__PURE__*/React.createElement(Badge, {
    kind: "danger"
  }, "Sin stock")), /*#__PURE__*/React.createElement(Input, {
    value: stock,
    onChange: setStock,
    digits: true,
    mono: true,
    align: "right",
    suffix: "u.",
    state: st(stock, v.stock),
    onEnter: save,
    ariaLabel: `Stock ${label(v)}`
  }), /*#__PURE__*/React.createElement(Input, {
    value: price,
    onChange: setPrice,
    digits: true,
    mono: true,
    align: "right",
    prefix: "$",
    state: st(price, v.price),
    onEnter: save,
    ariaLabel: `Precio ${label(v)}`
  }), dk ? /*#__PURE__*/React.createElement("div", null, dirty ? /*#__PURE__*/React.createElement(Btn, {
    full: true,
    onClick: save
  }, "Guardar") : ok ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: 'var(--admin-ok)',
      ...admS.body,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 18
  }), "Listo") : null) : (dirty || ok) && /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, dirty ? /*#__PURE__*/React.createElement(Btn, {
    full: true,
    onClick: save
  }, "Guardar cambios") : /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: 'var(--admin-ok)',
      ...admS.body,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Check",
    size: 18
  }), "Guardado")));
}
function AddVariantDialog({
  dk,
  product,
  onClose,
  onAdd
}) {
  const {
    LINES,
    label
  } = window.ADM;
  const [model, setModel] = React.useState('');
  const [color, setColor] = React.useState('');
  const [stock, setStock] = React.useState('0');
  const [price, setPrice] = React.useState(product ? String(product.variants[0] ? product.variants[0].price : '') : '');
  const [err, setErr] = React.useState(null);
  if (!product) return null;
  const submit = () => {
    const m = model === '__none' ? null : model;
    const c = color.trim().toLowerCase() || null;
    if (product.variants.some(v => v.model === m && (v.color || null) === c)) {
      setErr('Ya existe esa variante.');
      return;
    }
    onAdd({
      model: m,
      color: c,
      stock: Number(stock) || 0,
      price: Number(price)
    });
  };
  return /*#__PURE__*/React.createElement(Sheet, {
    open: true,
    dk: dk,
    onClose: onClose,
    title: "Agregar variante"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted,
      fontSize: 14
    }
  }, product.name), /*#__PURE__*/React.createElement(Field, {
    label: "Modelo de iPhone",
    htmlFor: "nv-model"
  }, /*#__PURE__*/React.createElement(NativeSelect, {
    id: "nv-model",
    value: model,
    onChange: v => {
      setModel(v);
      setErr(null);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Eleg\xED un modelo"), /*#__PURE__*/React.createElement("option", {
    value: "__none"
  }, "Sin modelo (sirve para todos)"), LINES.map(l => /*#__PURE__*/React.createElement("optgroup", {
    key: l[0],
    label: 'iPhone ' + l[0]
  }, l[1].map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, m)))))), /*#__PURE__*/React.createElement(Field, {
    label: "Color",
    htmlFor: "nv-color",
    hint: "Opcional. Vac\xEDo = color \xFAnico."
  }, /*#__PURE__*/React.createElement(Input, {
    id: "nv-color",
    value: color,
    onChange: v => {
      setColor(v);
      setErr(null);
    },
    placeholder: "Ej.: rosa"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Stock"
  }, /*#__PURE__*/React.createElement(Input, {
    value: stock,
    onChange: setStock,
    digits: true,
    mono: true,
    align: "right",
    suffix: "u."
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Precio"
  }, /*#__PURE__*/React.createElement(Input, {
    value: price,
    onChange: setPrice,
    digits: true,
    mono: true,
    align: "right",
    prefix: "$"
  }))), err && /*#__PURE__*/React.createElement(Notice, {
    kind: "danger"
  }, err), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    onClick: onClose
  }, "Cancelar"), /*#__PURE__*/React.createElement(Btn, {
    disabled: !model || !(Number(price) > 0),
    onClick: submit
  }, "Agregar"))));
}
function ProductEditor({
  dk,
  p,
  variants,
  open,
  onToggle,
  update,
  onAddVariant
}) {
  const {
    fmt
  } = window.ADM;
  const units = p.variants.reduce((s, v) => s + v.stock, 0);
  const outs = p.variants.filter(v => v.stock === 0).length;
  const prices = [...new Set(p.variants.map(v => v.price))];
  const sect = (t, c) => /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      ...admS.cap
    }
  }, t), c);
  const left = /*#__PURE__*/React.createElement(React.Fragment, null, sect('Nombre', /*#__PURE__*/React.createElement(NameEditor, {
    value: p.name,
    onSave: name => update(x => ({
      ...x,
      name
    }))
  })), sect(`Fotos en la web (${p.images.length})`, /*#__PURE__*/React.createElement(GalleryEditor, {
    dk: dk,
    images: p.images,
    onChange: images => update(x => ({
      ...x,
      images
    }))
  })), sect('Precio', /*#__PURE__*/React.createElement(BulkPrice, {
    product: p,
    onApply: price => update(x => ({
      ...x,
      variants: x.variants.map(v => ({
        ...v,
        price
      }))
    }))
  })));
  const right = sect(`Variantes (${variants.length}${variants.length !== p.variants.length ? ' de ' + p.variants.length : ''})`, /*#__PURE__*/React.createElement(React.Fragment, null, dk && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 108px 140px 104px',
      gap: 8,
      ...admS.muted,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, "Modelo \xB7 color"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "Stock"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "Precio"), /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("div", null, variants.map((v, k) => /*#__PURE__*/React.createElement(VariantRow, {
    key: v.id,
    dk: dk,
    v: v,
    first: k === 0,
    onSave: patch => update(x => ({
      ...x,
      variants: x.variants.map(y => y.id === v.id ? {
        ...y,
        ...patch
      } : y)
    }))
  }))), /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: "Plus",
    full: true,
    onClick: onAddVariant
  }, "Agregar variante")));
  return /*#__PURE__*/React.createElement(Card, {
    pad: 0
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggle,
    "aria-expanded": open,
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 12px 12px 16px',
      border: 0,
      background: 'transparent',
      textAlign: 'left',
      cursor: 'pointer',
      minHeight: 72
    }
  }, /*#__PURE__*/React.createElement(Thumb, {
    src: p.images[0],
    size: 52
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.body,
      fontSize: 16,
      fontWeight: 600
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      ...admS.muted,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", null, p.variants.length, " ", p.variants.length === 1 ? 'variante' : 'variantes', " \xB7 ", units, " u."), outs > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--admin-danger)',
      fontWeight: 600
    }
  }, "\xB7 ", outs, " sin stock"), dk && /*#__PURE__*/React.createElement("span", null, "\xB7 ", p.category, " \xB7 ", prices.length === 1 ? fmt(prices[0]) : 'varios precios'))), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--admin-muted)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronDown",
    size: 22
  }))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--admin-border)',
      padding: dk ? 24 : 16,
      display: 'grid',
      gridTemplateColumns: dk ? 'minmax(0,5fr) minmax(0,6fr)' : '1fr',
      gap: dk ? 32 : 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      minWidth: 0
    }
  }, left), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, right)));
}
function CatalogoScreen({
  dk,
  products,
  setProducts,
  focusId,
  notice,
  clearNotice
}) {
  const {
    MODELS,
    matches
  } = window.ADM;
  const [q, setQ] = React.useState('');
  const [model, setModel] = React.useState('');
  const [stockF, setStockF] = React.useState('all');
  const [openId, setOpenId] = React.useState(focusId || products[0] && products[0].id);
  const [adding, setAdding] = React.useState(null);
  const update = pid => fn => setProducts(ps => ps.map(p => p.id === pid ? fn(p) : p));
  const vOk = v => (!model || (model === '__none' ? !v.model : v.model === model)) && (stockF === 'all' || (stockF === 'in' ? v.stock > 0 : v.stock === 0));
  const list = products.map(p => ({
    p,
    variants: p.variants.filter(v => vOk(v) && matches(p, v, q))
  })).filter(r => r.variants.length || !q && !model && stockF === 'all');
  const totalV = list.reduce((s, r) => s + r.variants.length, 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: dk ? 1100 : undefined,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(PageTitle, {
    sub: `${list.length} productos · ${totalV} variantes`
  }, "Cat\xE1logo y stock"), notice && /*#__PURE__*/React.createElement(Notice, {
    kind: "ok",
    onClose: clearNotice
  }, notice), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'minmax(0,2fr) minmax(0,1fr) minmax(0,1.4fr)' : '1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: q,
    onChange: setQ,
    placeholder: "Buscar por nombre, modelo, color o categor\xEDa"
  }), /*#__PURE__*/React.createElement(NativeSelect, {
    ariaLabel: "Modelo de iPhone",
    value: model,
    onChange: setModel
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Todos los modelos"), /*#__PURE__*/React.createElement("option", {
    value: "__none"
  }, "Sin modelo (universales)"), MODELS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, m))), /*#__PURE__*/React.createElement(Seg, {
    ariaLabel: "Stock",
    value: stockF,
    onChange: setStockF,
    options: [{
      value: 'all',
      label: 'Todos'
    }, {
      value: 'in',
      label: 'Con stock'
    }, {
      value: 'out',
      label: 'Sin stock'
    }]
  })), list.length === 0 ? /*#__PURE__*/React.createElement(Empty, null, "No hay productos con esos filtros.") : list.map(({
    p,
    variants
  }) => /*#__PURE__*/React.createElement(ProductEditor, {
    key: p.id,
    dk: dk,
    p: p,
    variants: variants,
    open: openId === p.id,
    onToggle: () => setOpenId(openId === p.id ? null : p.id),
    update: update(p.id),
    onAddVariant: () => setAdding(p)
  })), /*#__PURE__*/React.createElement(AddVariantDialog, {
    key: adding ? adding.id : 'x',
    dk: dk,
    product: adding,
    onClose: () => setAdding(null),
    onAdd: v => {
      update(adding.id)(x => ({
        ...x,
        variants: [...x.variants, {
          id: 'v' + Date.now(),
          ...v
        }]
      }));
      setAdding(null);
    }
  }));
}
Object.assign(window, {
  CatalogoScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/CatalogoScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/ComprasScreens.jsx
try { (() => {
function SupplierPicker({
  suppliers,
  value,
  onChange,
  onCreate
}) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [contact, setContact] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Proveedor",
    htmlFor: "c-sup"
  }, /*#__PURE__*/React.createElement(NativeSelect, {
    id: "c-sup",
    value: creating ? '__new' : value,
    onChange: v => {
      if (v === '__new') {
        setCreating(true);
        onChange('');
      } else {
        setCreating(false);
        onChange(v);
      }
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Eleg\xED un proveedor"), suppliers.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name)), /*#__PURE__*/React.createElement("option", {
    value: "__new"
  }, "+ Nuevo proveedor"))), creating && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 16,
      borderRadius: 'var(--admin-radius)',
      background: 'var(--admin-bg)',
      border: '1px solid var(--admin-border)'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Nombre",
    htmlFor: "c-sn"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "c-sn",
    value: name,
    onChange: setName,
    autoFocus: true
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Datos de contacto (opcional)",
    htmlFor: "c-sc"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "c-sc",
    value: contact,
    onChange: setContact,
    placeholder: "Tel\xE9fono, mail, direcci\xF3n\u2026"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    onClick: () => setCreating(false)
  }, "Cancelar"), /*#__PURE__*/React.createElement(Btn, {
    disabled: !name.trim(),
    onClick: () => {
      const s = onCreate(name.trim(), contact.trim());
      onChange(s.id);
      setCreating(false);
      setName('');
      setContact('');
    }
  }, "Guardar proveedor"))));
}
function ComprasScreen({
  dk,
  products,
  suppliers,
  onCreateSupplier,
  onPurchase
}) {
  const {
    fmt,
    label,
    matches
  } = window.ADM;
  const [sup, setSup] = React.useState('');
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [notice, setNotice] = React.useState(null);
  const results = q.trim() ? products.flatMap(p => p.variants.filter(v => matches(p, v, q)).map(v => ({
    p,
    v
  }))).slice(0, 8) : [];
  const add = (p, v) => {
    setItems(it => it.some(i => i.vid === v.id) ? it.map(i => i.vid === v.id ? {
      ...i,
      qty: i.qty + 1
    } : i) : [...it, {
      vid: v.id,
      pid: p.id,
      name: p.name,
      model: v.model,
      color: v.color,
      stock: v.stock,
      qty: 1,
      cost: ''
    }]);
    setQ('');
  };
  const set = (vid, patch) => setItems(it => it.map(i => i.vid === vid ? {
    ...i,
    ...patch
  } : i));
  const units = items.reduce((s, i) => s + i.qty, 0);
  const cost = items.reduce((s, i) => s + i.qty * (Number(i.cost) || 0), 0);
  const ready = sup && items.length && items.every(i => Number(i.cost) > 0 && i.qty > 0);
  const submit = () => {
    onPurchase(items);
    const s = suppliers.find(x => x.id === sup);
    setNotice(`Compra registrada · ${s ? s.name : ''} · se ${units === 1 ? 'sumó 1 unidad' : `sumaron ${units} unidades`} al stock.`);
    setItems([]);
    setSup('');
  };
  const summary = /*#__PURE__*/React.createElement(Card, {
    pad: dk ? 20 : 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Productos",
    value: items.length
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Unidades que entran",
    value: units
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--admin-border)',
      margin: '2px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: admS.cap
  }, "Costo total"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--admin-text)'
    }
  }, fmt(cost))), /*#__PURE__*/React.createElement(Btn, {
    size: "lg",
    full: true,
    icon: "PackageCheck",
    disabled: !ready,
    onClick: submit,
    style: {
      marginTop: 6
    }
  }, "Registrar compra"), !ready && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted,
      textAlign: 'center'
    }
  }, !sup ? 'Elegí un proveedor.' : !items.length ? 'Agregá al menos un producto.' : 'Completá el costo de cada producto.')));
  const form = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(SupplierPicker, {
    suppliers: suppliers,
    value: sup,
    onChange: setSup,
    onCreate: onCreateSupplier
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      ...admS.label,
      marginBottom: 0
    }
  }, "Productos que entran"), /*#__PURE__*/React.createElement(SearchInput, {
    value: q,
    onChange: setQ,
    placeholder: "Buscar producto o modelo para agregar"
  }), q.trim() && /*#__PURE__*/React.createElement(Card, {
    pad: 0
  }, results.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      padding: 16,
      ...admS.muted
    }
  }, "Sin resultados. Si es un producto nuevo, crealo en \u201CNuevo\u201D.") : results.map(({
    p,
    v
  }, k) => /*#__PURE__*/React.createElement("button", {
    key: v.id,
    type: "button",
    onClick: () => add(p, v),
    style: {
      width: '100%',
      minHeight: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 12px 8px 16px',
      border: 0,
      borderTop: k ? '1px solid var(--admin-border)' : 0,
      background: '#fff',
      textAlign: 'left',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.body,
      fontWeight: 600
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.muted
    }
  }, label(v), " \xB7 stock ", v.stock)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      background: 'var(--admin-ink)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "Plus",
    size: 20,
    stroke: 2.2
  })))))), items.length === 0 ? /*#__PURE__*/React.createElement(Empty, null, "Busc\xE1 y agreg\xE1 los productos de esta compra.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, items.map(i => /*#__PURE__*/React.createElement(Card, {
    key: i.vid
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.body,
      fontWeight: 600
    }
  }, i.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      ...admS.muted
    }
  }, label(i), " \xB7 hoy hay ", i.stock, " \u2192 quedan ", i.stock + i.qty)), /*#__PURE__*/React.createElement(IconBtn, {
    icon: "Trash2",
    kind: "danger",
    label: "Quitar de la compra",
    onClick: () => setItems(it => it.filter(x => x.vid !== i.vid))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'auto minmax(0,180px) 1fr' : 'auto 1fr',
      gap: 12,
      alignItems: 'end',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Cantidad"
  }, /*#__PURE__*/React.createElement(Stepper, {
    value: i.qty,
    min: 1,
    onChange: qty => set(i.vid, {
      qty
    })
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Costo unitario"
  }, /*#__PURE__*/React.createElement(Input, {
    value: i.cost,
    onChange: cost => set(i.vid, {
      cost
    }),
    digits: true,
    mono: true,
    align: "right",
    prefix: "$",
    placeholder: "0",
    state: i.cost === '' ? null : 'dirty'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: dk ? undefined : '1 / -1',
      textAlign: 'right',
      ...admS.mono,
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--admin-text)'
    }
  }, Number(i.cost) > 0 ? `Subtotal ${fmt(i.qty * Number(i.cost))}` : ''))))));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: dk ? 1040 : undefined,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(PageTitle, {
    sub: "Mercader\xEDa que entra de un proveedor. Se suma al stock."
  }, "Cargar compra"), notice && /*#__PURE__*/React.createElement(Notice, {
    kind: "ok",
    onClose: () => setNotice(null)
  }, notice), dk ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 340px',
      gap: 24,
      alignItems: 'start'
    }
  }, form, /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'sticky',
      top: 88
    }
  }, summary)) : /*#__PURE__*/React.createElement(React.Fragment, null, form, summary));
}
function NuevoProductoScreen({
  dk,
  categories,
  onCreate
}) {
  const {
    LINES,
    fmt,
    shortModel
  } = window.ADM;
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [cat, setCat] = React.useState('');
  const [universal, setUniversal] = React.useState(false);
  const [models, setModels] = React.useState([]);
  const [colors, setColors] = React.useState([]);
  const [ct, setCt] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [stock, setStock] = React.useState('0');
  const [over, setOver] = React.useState({});
  const [gone, setGone] = React.useState([]);
  const toggle = m => setModels(ms => ms.includes(m) ? ms.filter(x => x !== m) : [...ms, m]);
  const toggleLine = l => setModels(ms => l[1].every(m => ms.includes(m)) ? ms.filter(m => !l[1].includes(m)) : [...new Set([...ms, ...l[1]])]);
  const addColor = () => {
    const c = ct.trim().toLowerCase();
    if (c && !colors.includes(c)) setColors([...colors, c]);
    setCt('');
  };
  const ordered = universal ? [null] : LINES.flatMap(l => l[1]).filter(m => models.includes(m));
  const rows = ordered.flatMap(m => (colors.length ? colors : [null]).map(c => ({
    key: (m || '-') + '|' + (c || '-'),
    model: m,
    color: c
  }))).filter(r => !gone.includes(r.key)).map(r => ({
    ...r,
    stock: over[r.key] && over[r.key].stock !== undefined ? over[r.key].stock : stock,
    price: over[r.key] && over[r.key].price !== undefined ? over[r.key].price : price
  }));
  const setO = (k, patch) => setOver(o => ({
    ...o,
    [k]: {
      ...o[k],
      ...patch
    }
  }));
  const ready = name.trim() && cat && rows.length && rows.every(r => Number(r.price) > 0);
  const create = () => onCreate({
    id: 'p' + Date.now(),
    name: name.trim(),
    description: desc.trim(),
    category: cat,
    images: [],
    variants: rows.map((r, k) => ({
      id: 'v' + Date.now() + k,
      model: r.model,
      color: r.color,
      stock: Number(r.stock) || 0,
      price: Number(r.price)
    }))
  });
  const datos = /*#__PURE__*/React.createElement(Card, {
    pad: dk ? 24 : 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(SectionTitle, null, "Datos"), /*#__PURE__*/React.createElement(Field, {
    label: "Nombre",
    htmlFor: "np-name"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "np-name",
    value: name,
    onChange: setName,
    placeholder: "Ej.: Cherry Case"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Descripci\xF3n",
    htmlFor: "np-desc",
    hint: "Se muestra en la ficha del producto en la web."
  }, /*#__PURE__*/React.createElement(TextArea, {
    id: "np-desc",
    value: desc,
    onChange: setDesc,
    placeholder: "Material, detalle, compatibilidad\u2026"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Categor\xEDa",
    htmlFor: "np-cat"
  }, /*#__PURE__*/React.createElement(NativeSelect, {
    id: "np-cat",
    value: cat,
    onChange: setCat
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Eleg\xED una categor\xEDa"), categories.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, c)))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted
    }
  }, "Las fotos se suben despu\xE9s, desde Cat\xE1logo.")));
  const variantes = /*#__PURE__*/React.createElement(Card, {
    pad: dk ? 24 : 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(SectionTitle, null, "Variantes"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: admS.label
  }, "\xBFPara qu\xE9 modelos?"), /*#__PURE__*/React.createElement(Seg, {
    value: universal ? 'u' : 'm',
    onChange: v => setUniversal(v === 'u'),
    options: [{
      value: 'm',
      label: 'Por modelo'
    }, {
      value: 'u',
      label: 'Sirve para todos'
    }]
  })), !universal && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 0
    }
  }, LINES.map(l => {
    const all = l[1].every(m => models.includes(m));
    return /*#__PURE__*/React.createElement("div", {
      key: l[0],
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderTop: '1px solid var(--admin-border)'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => toggleLine(l),
      "aria-pressed": all,
      title: "Toda la l\xEDnea",
      style: {
        width: 48,
        height: 44,
        flexShrink: 0,
        border: 0,
        borderRadius: 'var(--admin-radius)',
        background: all ? 'var(--admin-ink)' : 'transparent',
        color: all ? '#fff' : 'var(--admin-text)',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: '-.02em',
        cursor: 'pointer'
      }
    }, l[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        flexWrap: dk ? 'wrap' : 'nowrap',
        scrollbarWidth: 'none'
      }
    }, l[1].map(m => /*#__PURE__*/React.createElement(Chip, {
      key: m,
      active: models.includes(m),
      onClick: () => toggle(m)
    }, shortModel(m).replace(l[0], '').trim() || 'Base'))));
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Colores",
    hint: "Si no carg\xE1s colores, queda como color \xFAnico."
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Input, {
    value: ct,
    onChange: setCt,
    onEnter: addColor,
    placeholder: "Ej.: rosa",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: "Plus",
    onClick: addColor,
    disabled: !ct.trim()
  }, "Sumar")), colors.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10
    }
  }, colors.map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      height: 40,
      padding: '0 2px 0 14px',
      borderRadius: 9999,
      border: '1px solid var(--admin-border-strong)',
      ...admS.body,
      fontWeight: 500,
      textTransform: 'capitalize'
    }
  }, c, /*#__PURE__*/React.createElement(IconBtn, {
    icon: "X",
    size: 36,
    label: `Quitar ${c}`,
    onClick: () => setColors(colors.filter(x => x !== c))
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Precio de venta"
  }, /*#__PURE__*/React.createElement(Input, {
    value: price,
    onChange: setPrice,
    digits: true,
    mono: true,
    align: "right",
    prefix: "$",
    placeholder: "0"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Stock inicial"
  }, /*#__PURE__*/React.createElement(Input, {
    value: stock,
    onChange: setStock,
    digits: true,
    mono: true,
    align: "right",
    suffix: "u."
  }))), rows.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      ...admS.label,
      marginBottom: 4
    }
  }, "Se van a crear ", rows.length, " ", rows.length === 1 ? 'variante' : 'variantes'), /*#__PURE__*/React.createElement("p", {
    style: {
      ...admS.muted,
      margin: '0 0 4px'
    }
  }, "Pod\xE9s ajustar stock o precio de cada una."), rows.map((r, k) => /*#__PURE__*/React.createElement("div", {
    key: r.key,
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'minmax(0,1fr) 96px 128px 44px' : 'minmax(0,1fr) 44px',
      gap: 8,
      alignItems: 'center',
      padding: '10px 0',
      borderTop: '1px solid var(--admin-border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.body,
      fontWeight: 600
    }
  }, [r.model || 'Todos los modelos', r.color].filter(Boolean).join(' · ')), !dk && /*#__PURE__*/React.createElement(IconBtn, {
    icon: "X",
    label: "Quitar variante",
    onClick: () => setGone([...gone, r.key])
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: dk ? undefined : '1 / -1',
      display: dk ? 'contents' : 'grid',
      gridTemplateColumns: '1fr 1.3fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Input, {
    value: r.stock,
    onChange: v => setO(r.key, {
      stock: v
    }),
    digits: true,
    mono: true,
    align: "right",
    suffix: "u.",
    ariaLabel: "Stock"
  }), /*#__PURE__*/React.createElement(Input, {
    value: r.price,
    onChange: v => setO(r.key, {
      price: v
    }),
    digits: true,
    mono: true,
    align: "right",
    prefix: "$",
    ariaLabel: "Precio"
  })), dk && /*#__PURE__*/React.createElement(IconBtn, {
    icon: "X",
    label: "Quitar variante",
    onClick: () => setGone([...gone, r.key])
  })))), /*#__PURE__*/React.createElement(Btn, {
    size: "lg",
    full: true,
    icon: "PackagePlus",
    disabled: !ready,
    onClick: create
  }, "Crear producto", rows.length ? ` con ${rows.length} ${rows.length === 1 ? 'variante' : 'variantes'}` : ''), !ready && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '-8px 0 0',
      ...admS.muted,
      textAlign: 'center'
    }
  }, !name.trim() ? 'Falta el nombre.' : !cat ? 'Falta la categoría.' : !rows.length ? 'Elegí al menos un modelo.' : 'Falta el precio.')));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: dk ? 1100 : undefined,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(PageTitle, null, "Nuevo producto"), dk ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,4fr) minmax(0,6fr)',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 88
    }
  }, datos), variantes) : /*#__PURE__*/React.createElement(React.Fragment, null, datos, variantes));
}
Object.assign(window, {
  ComprasScreen,
  NuevoProductoScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/ComprasScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/HistorialScreen.jsx
try { (() => {
const ADM_PERIODS = [{
  value: 'today',
  label: 'Hoy'
}, {
  value: 'week',
  label: 'Semana'
}, {
  value: 'month',
  label: 'Mes'
}, {
  value: 'custom',
  label: 'Personalizado'
}];
const admDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const admAdd = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const admVal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const admParse = s => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
function admRange(kind, from, to) {
  const t = admDay(new Date());
  if (kind === 'today') return [t, admAdd(t, 1)];
  if (kind === 'week') {
    const m = admAdd(t, -((t.getDay() + 6) % 7));
    return [m, admAdd(m, 7)];
  }
  if (kind === 'month') return [new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 1)];
  const f = admParse(from),
    e = admParse(to);
  return f && e && f <= e ? [f, admAdd(e, 1)] : null;
}
function admDescribe(kind, r) {
  const last = admAdd(r[1], -1);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  if (kind === 'month') return cap(new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric'
  }).format(r[0]));
  if (r[0].getTime() === last.getTime()) return cap(new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(r[0]));
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long'
  }).formatRange(r[0], last);
}
const admTime = iso => new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
}).format(new Date(iso));
const admShortDay = iso => new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit'
}).format(new Date(iso));
const admUnits = s => s.items.reduce((a, i) => a + i.qty, 0);
const admPay = m => m === 'efectivo' ? 'Efectivo' : 'Transferencia';
function SummaryTile({
  label,
  value,
  detail,
  inverse,
  wide,
  dk
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: wide && !dk ? 'span 2' : undefined,
      background: inverse ? 'var(--admin-ink)' : '#fff',
      color: inverse ? '#fff' : 'var(--admin-text)',
      border: inverse ? 0 : '1px solid var(--admin-border)',
      borderRadius: 'var(--admin-radius)',
      padding: 16,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.cap,
      color: inverse ? 'rgb(255 255 255 / .7)' : 'var(--admin-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      ...admS.mono,
      fontSize: inverse ? 28 : 21,
      fontWeight: 700,
      lineHeight: 1.1,
      overflowWrap: 'anywhere'
    }
  }, value), detail && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: inverse ? 'rgb(255 255 255 / .7)' : 'var(--admin-muted)'
    }
  }, detail));
}
function SaleRow({
  s,
  showDay,
  open,
  onToggle,
  onVoid
}) {
  const {
    fmt,
    label
  } = window.ADM;
  const voided = s.status === 'anulada';
  const units = admUnits(s);
  return /*#__PURE__*/React.createElement("li", {
    style: {
      background: voided ? 'var(--admin-bg)' : '#fff',
      borderTop: '1px solid var(--admin-border)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggle,
    "aria-expanded": open,
    style: {
      width: '100%',
      minHeight: 64,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '14px 16px',
      border: 0,
      background: 'transparent',
      textAlign: 'left',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 54,
      flexShrink: 0,
      ...admS.mono,
      fontSize: 14,
      color: voided ? 'var(--admin-muted)' : 'var(--admin-text)',
      paddingTop: 2
    }
  }, showDay && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11,
      textTransform: 'uppercase',
      color: 'var(--admin-muted)'
    }
  }, admShortDay(s.date)), admTime(s.date)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      opacity: voided ? .6 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      fontSize: 17,
      fontWeight: 600,
      color: voided ? 'var(--admin-muted)' : 'var(--admin-text)',
      textDecoration: voided ? 'line-through' : 'none'
    }
  }, fmt(s.total)), s.discountPct > 0 && /*#__PURE__*/React.createElement(Badge, {
    kind: "neutral"
  }, "\u2212", s.discountPct, "%"), s.channel === 'web' && /*#__PURE__*/React.createElement(Badge, {
    kind: "ink"
  }, "Web ", s.webId), voided && /*#__PURE__*/React.createElement(Badge, {
    kind: "danger"
  }, "Anulada")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 2,
      ...admS.muted
    }
  }, units === 1 ? '1 producto' : `${units} productos`, " \xB7 ", admPay(s.method)), voided && s.voidReason && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 2,
      ...admS.muted
    }
  }, "Motivo: ", s.voidReason)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--admin-muted)',
      paddingTop: 2,
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronDown",
    size: 20
  }))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--admin-border)',
      padding: '14px 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, s.items.map((i, k) => /*#__PURE__*/React.createElement("li", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.body,
      fontWeight: 600
    }
  }, i.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.muted
    }
  }, label(i)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.muted,
      ...admS.mono
    }
  }, i.qty, " \xD7 ", fmt(i.price))), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--admin-text)',
      flexShrink: 0
    }
  }, fmt(i.qty * i.price))))), s.discountPct > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      paddingTop: 12,
      borderTop: '1px dashed var(--admin-border-strong)'
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Subtotal",
    value: fmt(s.subtotal)
  }), /*#__PURE__*/React.createElement(Row, {
    label: `Descuento ${s.discountPct}%`,
    value: '− ' + fmt(s.discount)
  }), /*#__PURE__*/React.createElement(Row, {
    label: "Total cobrado",
    value: fmt(s.total),
    strong: true
  })), voided ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted
    }
  }, "Anulada. No suma en los totales y su stock ya se devolvi\xF3.") : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Btn, {
    kind: "dangerOutline",
    icon: "Ban",
    onClick: onVoid
  }, "Anular venta"))));
}
const ADM_REASONS = ['Se cargó dos veces', 'El cliente devolvió la funda', 'Error de precio'];
function VoidDialog({
  dk,
  sale,
  onClose,
  onConfirm
}) {
  const {
    fmt
  } = window.ADM;
  const [reason, setReason] = React.useState('');
  const units = sale ? admUnits(sale) : 0;
  return /*#__PURE__*/React.createElement(Sheet, {
    open: !!sale,
    dk: dk,
    onClose: onClose,
    title: "Anular venta"
  }, sale && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted,
      fontSize: 14
    }
  }, admTime(sale.date), " \xB7 ", fmt(sale.total), " \xB7 ", admPay(sale.method)), /*#__PURE__*/React.createElement(Field, {
    label: "Motivo",
    htmlFor: "void-reason"
  }, /*#__PURE__*/React.createElement(TextArea, {
    id: "void-reason",
    value: reason,
    onChange: setReason,
    placeholder: "Ej.: se carg\xF3 dos veces, el cliente devolvi\xF3 la funda\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8
    }
  }, ADM_REASONS.map(r => /*#__PURE__*/React.createElement(Chip, {
    key: r,
    active: reason === r,
    onClick: () => setReason(r)
  }, r)))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.body
    }
  }, "Se van a devolver ", /*#__PURE__*/React.createElement("strong", null, units === 1 ? '1 unidad' : `${units} unidades`), " al stock. \xBFConfirm\xE1s?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    onClick: onClose
  }, "Cancelar"), /*#__PURE__*/React.createElement(Btn, {
    kind: "danger",
    disabled: !reason.trim(),
    onClick: () => onConfirm(reason.trim())
  }, "Anular venta"))));
}
function HistorialScreen({
  dk,
  sales,
  onVoid
}) {
  const {
    fmt
  } = window.ADM;
  const today = admVal(new Date());
  const [kind, setKind] = React.useState('today');
  const [from, setFrom] = React.useState(admVal(admAdd(new Date(), -6)));
  const [to, setTo] = React.useState(today);
  const [tab, setTab] = React.useState('ventas');
  const [openId, setOpenId] = React.useState(null);
  const [target, setTarget] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const range = admRange(kind, from, to);
  const inRange = range ? sales.filter(s => {
    const d = new Date(s.date);
    return d >= range[0] && d < range[1];
  }).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const valid = inRange.filter(s => s.status !== 'anulada');
  const sum = arr => arr.reduce((a, s) => a + s.total, 0);
  const cash = valid.filter(s => s.method === 'efectivo'),
    transfer = valid.filter(s => s.method === 'transferencia');
  const total = sum(valid);
  const showDay = range && range[1] - range[0] > 25 * 3600e3;
  const top = Object.values(valid.reduce((m, s) => {
    s.items.forEach(i => {
      const r = m[i.name] || (m[i.name] = {
        name: i.name,
        units: 0,
        revenue: 0
      });
      r.units += i.qty;
      r.revenue += Math.round(i.qty * i.price * (1 - s.discountPct / 100));
    });
    return m;
  }, {})).sort((a, b) => b.units - a.units || b.revenue - a.revenue);
  const count = n => n === 1 ? '1 venta' : `${n} ventas`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: dk ? 960 : undefined,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(PageTitle, null, "Historial de ventas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Seg, {
    ariaLabel: "Per\xEDodo",
    options: ADM_PERIODS,
    value: kind,
    onChange: k => {
      setKind(k);
      setOpenId(null);
    },
    cols: dk ? 4 : 2
  }), kind === 'custom' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Desde",
    htmlFor: "h-from"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "h-from",
    type: "date",
    value: from,
    onChange: setFrom
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Hasta",
    htmlFor: "h-to"
  }, /*#__PURE__*/React.createElement(Input, {
    id: "h-to",
    type: "date",
    value: to,
    onChange: setTo
  })), !range && /*#__PURE__*/React.createElement("p", {
    style: {
      gridColumn: 'span 2',
      margin: 0,
      ...admS.muted
    }
  }, "\u201CDesde\u201D tiene que ser igual o anterior a \u201CHasta\u201D.")), range && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.body,
      fontWeight: 600
    }
  }, admDescribe(kind, range))), range && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    "aria-label": "Resumen",
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'repeat(4, minmax(0,1fr))' : 'repeat(2, minmax(0,1fr))',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(SummaryTile, {
    dk: dk,
    wide: true,
    inverse: true,
    label: "Total ingresado",
    value: fmt(total),
    detail: valid.length ? `Ticket promedio ${fmt(Math.round(total / valid.length))}` : 'Sin ventas todavía'
  }), /*#__PURE__*/React.createElement(SummaryTile, {
    dk: dk,
    label: "Efectivo",
    value: fmt(sum(cash)),
    detail: count(cash.length)
  }), /*#__PURE__*/React.createElement(SummaryTile, {
    dk: dk,
    label: "Transferencia",
    value: fmt(sum(transfer)),
    detail: count(transfer.length)
  }), /*#__PURE__*/React.createElement(SummaryTile, {
    dk: dk,
    wide: true,
    label: "Ventas",
    value: valid.length,
    detail: "sin contar anuladas"
  })), notice && /*#__PURE__*/React.createElement(Notice, {
    onClose: () => setNotice(null)
  }, notice), /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      borderBottom: '1px solid var(--admin-border)'
    }
  }, [['ventas', `Ventas (${inRange.length})`], ['top', 'Más vendidos']].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    role: "tab",
    "aria-selected": tab === v,
    onClick: () => setTab(v),
    style: {
      height: 48,
      marginBottom: -1,
      padding: '0 16px',
      border: 0,
      borderBottom: '2px solid ' + (tab === v ? 'var(--admin-ink)' : 'transparent'),
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      fontWeight: 600,
      color: tab === v ? 'var(--admin-text)' : 'var(--admin-muted)',
      cursor: 'pointer'
    }
  }, l))), tab === 'ventas' ? inRange.length === 0 ? /*#__PURE__*/React.createElement(Empty, null, "No hubo ventas en este per\xEDodo.") : /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      border: '1px solid var(--admin-border)',
      borderTop: 0,
      borderRadius: 'var(--admin-radius)',
      overflow: 'hidden'
    }
  }, inRange.map(s => /*#__PURE__*/React.createElement(SaleRow, {
    key: s.id,
    s: s,
    showDay: showDay,
    open: openId === s.id,
    onToggle: () => setOpenId(openId === s.id ? null : s.id),
    onVoid: () => {
      setNotice(null);
      setTarget(s);
    }
  }))) : top.length === 0 ? /*#__PURE__*/React.createElement(Empty, null, "Todav\xEDa no hay productos vendidos en este per\xEDodo.") : /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      background: '#fff',
      border: '1px solid var(--admin-border)',
      borderRadius: 'var(--admin-radius)'
    }
  }, top.map((p, k) => /*#__PURE__*/React.createElement("li", {
    key: p.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      borderTop: k ? '1px solid var(--admin-border)' : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 20,
      color: k < 3 ? 'var(--admin-text)' : 'var(--admin-muted)'
    }
  }, k + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      ...admS.body,
      fontWeight: 600
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.mono,
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--admin-text)'
    }
  }, p.units, " u."), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.mono,
      ...admS.muted
    }
  }, fmt(p.revenue))))))), /*#__PURE__*/React.createElement(VoidDialog, {
    key: target ? target.id : 'none',
    dk: dk,
    sale: target,
    onClose: () => setTarget(null),
    onConfirm: reason => {
      const u = onVoid(target.id, reason);
      setTarget(null);
      setNotice(`Venta anulada. ${u === 1 ? 'Se devolvió 1 unidad' : `Se devolvieron ${u} unidades`} al stock.`);
    }
  }));
}
Object.assign(window, {
  HistorialScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/HistorialScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/VentasScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ADM_DISCOUNTS = [{
  value: '0',
  label: 'Sin'
}, {
  value: '10',
  label: '10%'
}, {
  value: '15',
  label: '15%'
}, {
  value: '20',
  label: '20%'
}, {
  value: 'otro',
  label: 'Otro'
}];
const ADM_PAY = [{
  value: 'efectivo',
  label: 'Efectivo',
  icon: 'Banknote'
}, {
  value: 'transferencia',
  label: 'Transferencia',
  icon: 'Landmark'
}];
function SellCard({
  p,
  variants,
  inCart,
  onAdd
}) {
  const {
    fmt,
    label
  } = window.ADM;
  return /*#__PURE__*/React.createElement(Card, {
    pad: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement(Thumb, {
    src: p.images[0],
    size: 44
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.body,
      fontSize: 16,
      fontWeight: 600
    }
  }, p.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted
    }
  }, p.category))), variants.map(v => {
    const n = inCart(v.id);
    const out = v.stock <= 0;
    const limit = !out && n >= v.stock;
    return /*#__PURE__*/React.createElement("button", {
      key: v.id,
      type: "button",
      disabled: out || limit,
      onClick: () => onAdd(p, v),
      style: {
        width: '100%',
        minHeight: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 12px 8px 16px',
        border: 0,
        borderTop: '1px solid var(--admin-border)',
        background: n ? '#f5f5f5' : '#fff',
        textAlign: 'left',
        cursor: out || limit ? 'default' : 'pointer'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 0,
        opacity: out ? .45 : 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        ...admS.body,
        fontWeight: 500
      }
    }, label(v)), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 6,
        ...admS.muted,
        marginTop: 2
      }
    }, out ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--admin-danger)',
        fontWeight: 600
      }
    }, "Sin stock") : v.stock <= 3 ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--admin-warn)',
        fontWeight: 600
      }
    }, "Quedan ", v.stock) : /*#__PURE__*/React.createElement("span", null, "Stock ", v.stock), n > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--admin-text)',
        fontWeight: 600
      }
    }, "\xB7 ", n, " en la venta"))), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...admS.mono,
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--admin-text)',
        opacity: out ? .45 : 1
      }
    }, fmt(v.price)), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: out || limit ? 'var(--admin-disabled-bg)' : 'var(--admin-ink)',
        color: out || limit ? 'var(--admin-disabled-fg)' : '#fff'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "Plus",
      size: 20,
      stroke: 2.2
    }))));
  }));
}
function CartPanel({
  items,
  setQty,
  disc,
  setDisc,
  other,
  setOther,
  method,
  setMethod,
  subtotal,
  pct,
  discount,
  total,
  onConfirm,
  heading
}) {
  const {
    fmt,
    label
  } = window.ADM;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, heading, items.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '8px 0',
      textAlign: 'center',
      ...admS.muted,
      fontSize: 14
    }
  }, "Todav\xEDa no agregaste productos. Toc\xE1 un modelo para sumarlo.") : /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, items.map((i, k) => /*#__PURE__*/React.createElement("li", {
    key: i.vid,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0',
      borderTop: k ? '1px solid var(--admin-border)' : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.body,
      fontWeight: 600
    }
  }, i.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      ...admS.muted
    }
  }, label(i)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      ...admS.mono,
      fontSize: 14,
      color: 'var(--admin-text)'
    }
  }, fmt(i.price))), /*#__PURE__*/React.createElement(Stepper, {
    value: i.qty,
    min: 0,
    max: i.stock,
    onChange: q => setQty(i.vid, q)
  })))), items.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: admS.label
  }, "Descuento"), /*#__PURE__*/React.createElement(Seg, {
    ariaLabel: "Descuento",
    options: ADM_DISCOUNTS,
    value: disc,
    onChange: setDisc
  }), disc === 'otro' && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Input, {
    value: other,
    onChange: setOther,
    digits: true,
    suffix: "%",
    placeholder: "Escrib\xED el porcentaje",
    autoFocus: true,
    mono: true,
    ariaLabel: "Otro porcentaje"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 16,
      background: 'var(--admin-bg)',
      borderRadius: 'var(--admin-radius)',
      border: '1px solid var(--admin-border)'
    }
  }, /*#__PURE__*/React.createElement(Row, {
    label: "Subtotal",
    value: fmt(subtotal)
  }), /*#__PURE__*/React.createElement(Row, {
    label: pct > 0 ? `Descuento ${pct}%` : 'Descuento',
    value: pct > 0 ? '− ' + fmt(discount) : '—',
    muted: !pct
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--admin-border)',
      margin: '4px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: admS.cap
  }, "Total a cobrar"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      fontSize: 'var(--admin-total)',
      fontWeight: 700,
      color: 'var(--admin-text)',
      lineHeight: 1
    }
  }, fmt(total)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: admS.label
  }, "Medio de pago"), /*#__PURE__*/React.createElement(Seg, {
    ariaLabel: "Medio de pago",
    options: ADM_PAY,
    value: method,
    onChange: setMethod,
    h: "var(--admin-cta-h)"
  })), /*#__PURE__*/React.createElement(Btn, {
    size: "lg",
    full: true,
    onClick: onConfirm,
    icon: "Check"
  }, "Cobrar ", fmt(total))));
}
function VentasScreen({
  dk,
  products,
  onConfirm
}) {
  const {
    LINES,
    fmt,
    matches,
    lineOf
  } = window.ADM;
  const [q, setQ] = React.useState('');
  const [line, setLine] = React.useState('');
  const [cart, setCart] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [disc, setDisc] = React.useState('0');
  const [other, setOther] = React.useState('');
  const [method, setMethod] = React.useState('efectivo');
  const [done, setDone] = React.useState(null);
  const results = products.map(p => ({
    p,
    variants: p.variants.filter(v => matches(p, v, q) && (!line || lineOf(v.model) === line))
  })).filter(r => r.variants.length);
  const inCart = vid => (cart.find(i => i.vid === vid) || {}).qty || 0;
  const add = (p, v) => setCart(c => {
    const e = c.find(i => i.vid === v.id);
    if (e) return e.qty >= v.stock ? c : c.map(i => i.vid === v.id ? {
      ...i,
      qty: i.qty + 1
    } : i);
    return v.stock < 1 ? c : [...c, {
      pid: p.id,
      vid: v.id,
      name: p.name,
      model: v.model,
      color: v.color,
      price: v.price,
      qty: 1,
      stock: v.stock
    }];
  });
  const setQty = (vid, qty) => setCart(c => qty <= 0 ? c.filter(i => i.vid !== vid) : c.map(i => i.vid === vid ? {
    ...i,
    qty
  } : i));
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const pct = disc === 'otro' ? Math.min(100, Number(other) || 0) : Number(disc);
  const discount = Math.round(subtotal * pct / 100);
  const total = subtotal - discount;
  const confirm = () => {
    const sale = onConfirm({
      items: cart,
      subtotal,
      discountPct: pct,
      discount,
      total,
      method
    });
    setDone(sale);
    setCart([]);
    setOpen(false);
    setDisc('0');
    setOther('');
    setMethod('efectivo');
  };
  const panelProps = {
    items: cart,
    setQty,
    disc,
    setDisc,
    other,
    setOther,
    method,
    setMethod,
    subtotal,
    pct,
    discount,
    total,
    onConfirm: confirm
  };
  const search = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: q,
    onChange: setQ,
    placeholder: "Buscar producto o modelo\u2026 ej. cherry 15 pro"
  }), /*#__PURE__*/React.createElement(ChipRow, {
    wrap: dk,
    value: line,
    onChange: setLine,
    options: [{
      value: '',
      label: 'Todos'
    }, ...LINES.map(l => ({
      value: l[0],
      label: 'iPhone ' + l[0]
    }))]
  }));
  const list = results.length === 0 ? /*#__PURE__*/React.createElement(Empty, null, "No encontramos productos con esa b\xFAsqueda.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'repeat(2, minmax(0,1fr))' : '1fr',
      gap: 12,
      alignItems: 'start'
    }
  }, results.map(({
    p,
    variants
  }) => /*#__PURE__*/React.createElement(SellCard, {
    key: p.id,
    p: p,
    variants: variants,
    inCart: inCart,
    onAdd: add
  })));
  return /*#__PURE__*/React.createElement(React.Fragment, null, dk ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 400px',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(PageTitle, {
    sub: "Toc\xE1 un modelo para sumarlo a la venta."
  }, "Nueva venta"), search, list), /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'sticky',
      top: 88
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: 20
  }, /*#__PURE__*/React.createElement(CartPanel, _extends({}, panelProps, {
    heading: /*#__PURE__*/React.createElement(SectionTitle, {
      right: count ? /*#__PURE__*/React.createElement("span", {
        style: admS.muted
      }, count, " ", count === 1 ? 'producto' : 'productos') : null
    }, "Venta actual")
  }))))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      paddingBottom: count ? 72 : 0
    }
  }, /*#__PURE__*/React.createElement(PageTitle, null, "Nueva venta"), search, list), !dk && count > 0 && !open && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(true),
    style: {
      position: 'fixed',
      zIndex: 35,
      bottom: 'calc(var(--admin-nav-h) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(min(100%, 430px) - 32px)',
      height: 60,
      borderRadius: 'var(--admin-radius)',
      border: 0,
      background: 'var(--admin-ink)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px 0 18px',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      boxShadow: '0 8px 24px rgb(0 0 0 / .18)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 15,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 26,
      height: 26,
      borderRadius: 13,
      background: '#fff',
      color: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...admS.mono,
      fontSize: 14,
      fontWeight: 700
    }
  }, count), "Ver venta"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      ...admS.mono,
      fontSize: 18,
      fontWeight: 700
    }
  }, fmt(total), /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronUp",
    size: 20
  }))), !dk && /*#__PURE__*/React.createElement(Sheet, {
    open: open,
    onClose: () => setOpen(false),
    title: "Venta actual"
  }, /*#__PURE__*/React.createElement(CartPanel, panelProps)), /*#__PURE__*/React.createElement(Sheet, {
    open: !!done,
    center: true,
    dk: dk,
    onClose: () => setDone(null),
    width: 400
  }, done && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      textAlign: 'center',
      paddingTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--admin-ok)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "CircleCheck",
    size: 48,
    stroke: 1.5
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '8px 0 0',
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 22,
      color: 'var(--admin-text)'
    }
  }, "Venta registrada"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '8px 0 0',
      ...admS.cap
    }
  }, "Total cobrado"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.mono,
      fontSize: 36,
      fontWeight: 700,
      color: 'var(--admin-text)'
    }
  }, fmt(done.total)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted,
      fontSize: 14
    }
  }, done.method === 'efectivo' ? 'Efectivo' : 'Transferencia', done.discountPct ? ` · ${done.discountPct}% de descuento (− ${fmt(done.discount)})` : ''), /*#__PURE__*/React.createElement(Btn, {
    size: "lg",
    full: true,
    style: {
      marginTop: 20
    },
    onClick: () => setDone(null)
  }, "Nueva venta"))));
}
Object.assign(window, {
  VentasScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/VentasScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/WebVentasScreen.jsx
try { (() => {
const WEB_REASONS = ['No mandó el comprobante', 'Se arrepintió', 'No hay stock real'];
const webTime = iso => new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
}).format(new Date(iso));
const webAgo = (iso, now) => {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : `hace ${Math.floor(m / 1440)} d`;
};
const webUnits = o => o.items.reduce((s, i) => s + i.qty, 0);
function WebOrderCard({
  o,
  now,
  onPaid,
  onCancel
}) {
  const {
      fmt,
      label
    } = window.ADM,
    R = window.LF_RES;
  const ms = R.left(o, now),
    pending = o.status === 'pendiente',
    expired = pending && ms <= 0;
  const pct = Math.max(0, Math.min(1, ms / (R.CONFIG.holdHours * 3600e3)));
  const badge = o.status === 'pagada' ? /*#__PURE__*/React.createElement(Badge, {
    kind: "ok"
  }, "Pagada") : o.status === 'cancelada' ? /*#__PURE__*/React.createElement(Badge, null, "Cancelada") : expired ? /*#__PURE__*/React.createElement(Badge, {
    kind: "danger"
  }, "Vencida") : /*#__PURE__*/React.createElement(Badge, {
    kind: "warn"
  }, "Pendiente de pago");
  return /*#__PURE__*/React.createElement(Card, {
    pad: 0,
    style: {
      opacity: o.status === 'cancelada' ? .6 : 1,
      borderColor: expired ? 'var(--admin-danger-border)' : undefined
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      fontSize: 15,
      fontWeight: 700,
      color: 'var(--admin-text)'
    }
  }, o.id), badge), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.body,
      fontWeight: 600
    }
  }, o.customer.name)), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--admin-text)',
      textDecoration: o.status === 'cancelada' ? 'line-through' : 'none',
      flexShrink: 0
    }
  }, fmt(o.total))), pending && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8,
      ...admS.muted
    }
  }, /*#__PURE__*/React.createElement("span", null, "Reservada ", webAgo(o.createdAt, now)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: expired ? 'var(--admin-danger)' : ms < 3 * 3600e3 ? 'var(--admin-warn)' : 'var(--admin-text)'
    }
  }, expired ? 'Venció la reserva' : 'Vence en ' + R.leftText(ms))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      borderRadius: 2,
      background: 'var(--admin-border)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: pct * 100 + '%',
      background: expired ? 'var(--admin-danger)' : ms < 3 * 3600e3 ? 'var(--admin-warn)' : 'var(--admin-ink)'
    }
  }))), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: '12px 0 0',
      borderTop: '1px solid var(--admin-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, o.items.map((i, k) => /*#__PURE__*/React.createElement("li", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.body,
      fontWeight: 600
    }
  }, i.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      ...admS.muted
    }
  }, label(i), " \xB7 ", i.qty, " \xD7 ", fmt(i.price))), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      fontSize: 15,
      color: 'var(--admin-text)',
      flexShrink: 0
    }
  }, fmt(i.qty * i.price))))), o.status === 'pagada' && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted
    }
  }, "Pagada ", webTime(o.paidAt), " \xB7 ya figura en el historial."), o.status === 'cancelada' && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted
    }
  }, "Cancelada", o.cancelReason ? ` · ${o.cancelReason}` : '', " \xB7 el stock volvi\xF3."), expired && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted,
      color: 'var(--admin-danger)'
    }
  }, "Pasaron las 24 h. Si no pag\xF3, cancelala para liberar el stock."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: pending ? '44px 1fr 1fr' : '1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: R.customerLink(o),
    target: "_blank",
    rel: "noopener",
    "aria-label": `Escribir a ${o.customer.name} por WhatsApp`,
    title: o.customer.phone,
    style: {
      height: 'var(--admin-control-h)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 'var(--admin-radius)',
      border: '1px solid var(--admin-border-strong)',
      color: 'var(--admin-text)',
      textDecoration: 'none',
      ...admS.body,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "MessageCircle",
    size: 20
  }), pending ? '' : `WhatsApp · ${o.customer.phone}`), pending && /*#__PURE__*/React.createElement(Btn, {
    kind: "dangerOutline",
    onClick: onCancel
  }, "Cancelar"), pending && /*#__PURE__*/React.createElement(Btn, {
    icon: "Check",
    onClick: onPaid
  }, "Pagada"))));
}
function WebVentasScreen({
  dk,
  orders,
  onPaid,
  onCancel
}) {
  const {
    fmt
  } = window.ADM;
  const [f, setF] = React.useState('pendiente');
  const [pay, setPay] = React.useState(null);
  const [cancel, setCancel] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const [notice, setNotice] = React.useState(null);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const n = s => orders.filter(o => o.status === s).length;
  const list = orders.filter(o => o.status === f).sort((a, b) => f === 'pendiente' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const pendingTotal = orders.filter(o => o.status === 'pendiente').reduce((s, o) => s + o.total, 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: dk ? 1040 : undefined,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(PageTitle, {
    sub: n('pendiente') ? `${n('pendiente')} por cobrar · ${fmt(pendingTotal)}` : 'Reservas hechas desde la tienda. Se guardan 24 horas.'
  }, "Ventas web"), /*#__PURE__*/React.createElement(Seg, {
    ariaLabel: "Estado",
    value: f,
    onChange: setF,
    options: [{
      value: 'pendiente',
      label: `Pendientes (${n('pendiente')})`
    }, {
      value: 'pagada',
      label: dk ? `Pagadas (${n('pagada')})` : 'Pagadas'
    }, {
      value: 'cancelada',
      label: dk ? `Canceladas (${n('cancelada')})` : 'Canceladas'
    }]
  }), notice && /*#__PURE__*/React.createElement(Notice, {
    kind: "ok",
    onClose: () => setNotice(null)
  }, notice), list.length === 0 ? /*#__PURE__*/React.createElement(Empty, null, f === 'pendiente' ? 'No hay reservas esperando pago.' : f === 'pagada' ? 'Todavía no hay ventas web pagadas.' : 'No hay reservas canceladas.') : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'repeat(2, minmax(0,1fr))' : '1fr',
      gap: 12,
      alignItems: 'start'
    }
  }, list.map(o => /*#__PURE__*/React.createElement(WebOrderCard, {
    key: o.id,
    o: o,
    now: now,
    onPaid: () => {
      setNotice(null);
      setPay(o);
    },
    onCancel: () => {
      setNotice(null);
      setReason(R0(o, now));
      setCancel(o);
    }
  }))), /*#__PURE__*/React.createElement(Sheet, {
    open: !!pay,
    dk: dk,
    onClose: () => setPay(null),
    title: "Marcar como pagada"
  }, pay && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.body
    }
  }, "\xBFRecibiste la transferencia de ", /*#__PURE__*/React.createElement("strong", null, pay.customer.name), " por ", /*#__PURE__*/React.createElement("strong", {
    style: admS.mono
  }, fmt(pay.total)), "?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted,
      fontSize: 14
    }
  }, "La reserva ", pay.id, " pasa al historial como venta por transferencia. El stock ya estaba descontado."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    onClick: () => setPay(null)
  }, "Volver"), /*#__PURE__*/React.createElement(Btn, {
    icon: "Check",
    onClick: () => {
      onPaid(pay.id);
      setNotice(`${pay.id} marcada como pagada · ${fmt(pay.total)} sumado al historial.`);
      setPay(null);
    }
  }, "S\xED, pagada")))), /*#__PURE__*/React.createElement(Sheet, {
    open: !!cancel,
    dk: dk,
    onClose: () => setCancel(null),
    title: "Cancelar reserva"
  }, cancel && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.muted,
      fontSize: 14
    }
  }, cancel.id, " \xB7 ", cancel.customer.name, " \xB7 ", fmt(cancel.total)), /*#__PURE__*/React.createElement(Field, {
    label: "Motivo (opcional)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, WEB_REASONS.map(r => /*#__PURE__*/React.createElement(Chip, {
    key: r,
    active: reason === r,
    onClick: () => setReason(reason === r ? '' : r)
  }, r)))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...admS.body
    }
  }, webUnits(cancel) === 1 ? 'Vuelve 1 unidad' : `Vuelven ${webUnits(cancel)} unidades`, " al stock. \xBFConfirm\xE1s?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    onClick: () => setCancel(null)
  }, "Volver"), /*#__PURE__*/React.createElement(Btn, {
    kind: "danger",
    onClick: () => {
      const u = onCancel(cancel.id, reason);
      setNotice(`${cancel.id} cancelada. ${u === 1 ? 'Volvió 1 unidad' : `Volvieron ${u} unidades`} al stock.`);
      setCancel(null);
    }
  }, "Cancelar reserva")))));
}
const R0 = (o, now) => window.LF_RES.left(o, now) <= 0 ? WEB_REASONS[0] : '';
Object.assign(window, {
  WebVentasScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/WebVentasScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/adminData.js
try { (() => {
// Datos de muestra del panel. Modelos = seed real; productos, stock, ventas = ejemplo.
(function () {
  const A = '../../assets/photos/';
  const LINES = [['11', ['iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max']], ['12', ['iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max']], ['13', ['iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max']], ['14', ['iPhone 14', 'iPhone 14 Pro', 'iPhone 14 Pro Max']], ['15', ['iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max']], ['16', ['iPhone 16', 'iPhone 16 Pro', 'iPhone 16 Pro Max']], ['17', ['iPhone 17', 'iPhone 17 Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max']], ['18', ['iPhone 18', 'iPhone 18 Air', 'iPhone 18 Pro', 'iPhone 18 Pro Max']]];
  const MODELS = LINES.flatMap(l => l[1]);
  const CATEGORIES = ['Transparentes', 'De diseño', 'De silicona', 'Cargadores y cables', 'Straps', 'Protector de cargador', 'Lentes de cámara'];
  let n = 0;
  const V = (model, color, stock, price) => ({
    id: 'v' + ++n,
    model,
    color,
    stock,
    price
  });
  const each = (models, colors, stocks, price) => {
    let k = 0;
    return models.flatMap(m => colors.map(c => V(m, c, stocks[k++ % stocks.length], price)));
  };
  const products = [{
    id: 'p1',
    name: 'Cherry Case',
    category: 'Transparentes',
    description: 'Transparente con cerezas estampadas y bordes plateados.',
    images: [A + 'cherry-cases.jpg', A + 'coleccion-flatlay-a.jpg', A + 'coleccion-flatlay-b.jpg'],
    variants: each(['iPhone 13 Pro', 'iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 16 Pro', 'iPhone 16 Pro Max', 'iPhone 17 Pro'], ['transparente'], [4, 2, 6, 0, 5, 3, 7], 18500)
  }, {
    id: 'p2',
    name: 'Wave Case',
    category: 'De diseño',
    description: 'Relieve ondulado con marco metalizado.',
    images: [A + 'wave-cases-mesa.jpg', A + 'coleccion-flatlay-a.jpg'],
    variants: each(['iPhone 15 Pro', 'iPhone 16 Pro'], ['negro', 'rosa', 'azul', 'blanco'], [3, 1, 0, 4, 2, 5, 2, 0], 19900)
  }, {
    id: 'p3',
    name: 'Star Case',
    category: 'De diseño',
    description: '',
    images: [A + 'star-cases.jpg'],
    variants: each(['iPhone 15 Pro', 'iPhone 16 Pro Max'], ['rosa'], [1, 2], 19900)
  }, {
    id: 'p4',
    name: 'MagCase',
    category: 'De silicona',
    description: 'Compatible con MagSafe. Tacto mate.',
    images: [A + 'magsafe-colores-mesa.jpg', A + 'coleccion-flatlay-b.jpg'],
    variants: each(['iPhone 16', 'iPhone 16 Pro', 'iPhone 17 Pro'], ['azul', 'blanco', 'naranja'], [6, 3, 2, 4, 0, 1, 5, 2, 3], 15000)
  }, {
    id: 'p5',
    name: 'Smoky Case',
    category: 'De diseño',
    description: '',
    images: [A + 'marble-cases.jpg'],
    variants: each(['iPhone 15 Pro', 'iPhone 16 Pro'], ['tornasolado'], [3, 2], 19900)
  }, {
    id: 'p6',
    name: 'Cargador 20 W',
    category: 'Cargadores y cables',
    description: 'Cabezal USB-C de carga rápida.',
    images: [],
    variants: [V(null, 'blanco', 10, 12000)]
  }, {
    id: 'p7',
    name: 'Cable USB-C a USB-C',
    category: 'Cargadores y cables',
    description: 'Para iPhone 15 en adelante.',
    images: [],
    variants: [V(null, 'blanco', 14, 8500)]
  }, {
    id: 'p8',
    name: 'Cable USB-C a Lightning',
    category: 'Cargadores y cables',
    description: 'Para iPhone 11 a 14.',
    images: [],
    variants: [V(null, 'blanco', 0, 8500)]
  }, {
    id: 'p9',
    name: 'Strap corto',
    category: 'Straps',
    description: '',
    images: [],
    variants: each([null], ['negro', 'rosa', 'blanco'], [5, 2, 1], 9000)
  }, {
    id: 'p10',
    name: 'Protector de lentes de cámara',
    category: 'Lentes de cámara',
    description: '',
    images: [],
    variants: each(['iPhone 15 Pro', 'iPhone 16 Pro', 'iPhone 17 Pro'], ['plateado', 'negro'], [3, 2, 4, 0, 2, 3], 7000)
  }];
  const find = (pid, model, color) => {
    const p = products.find(x => x.id === pid);
    const v = p.variants.find(x => x.model === model && x.color === color);
    return {
      p,
      v
    };
  };
  const at = (daysAgo, h, m) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  let sn = 0;
  const S = (date, method, pct, lines, status, reason) => {
    const items = lines.map(([pid, model, color, qty]) => {
      const {
        p,
        v
      } = find(pid, model, color);
      return {
        pid,
        vid: v.id,
        name: p.name,
        model,
        color,
        qty,
        price: v.price
      };
    });
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const discount = Math.round(subtotal * pct / 100);
    return {
      id: 's' + ++sn,
      date,
      method,
      discountPct: pct,
      subtotal,
      discount,
      total: subtotal - discount,
      items,
      status: status || 'ok',
      voidReason: reason || null,
      voidedAt: status ? date : null
    };
  };
  const sales = [S(at(0, 13, 10), 'efectivo', 0, [['p1', 'iPhone 17 Pro', 'transparente', 1]]), S(at(0, 12, 30), 'transferencia', 15, [['p5', 'iPhone 16 Pro', 'tornasolado', 1], ['p6', null, 'blanco', 1]]), S(at(0, 11, 52), 'efectivo', 0, [['p3', 'iPhone 15 Pro', 'rosa', 1]], 'anulada', 'Se cargó dos veces'), S(at(0, 11, 5), 'efectivo', 0, [['p4', 'iPhone 16 Pro', 'azul', 1]]), S(at(0, 10, 40), 'transferencia', 10, [['p2', 'iPhone 16 Pro', 'negro', 2], ['p7', null, 'blanco', 1]]), S(at(0, 10, 12), 'efectivo', 0, [['p1', 'iPhone 15', 'transparente', 1]]), S(at(1, 18, 20), 'transferencia', 0, [['p4', 'iPhone 17 Pro', 'blanco', 1], ['p9', null, 'rosa', 1]]), S(at(1, 16, 45), 'efectivo', 20, [['p2', 'iPhone 15 Pro', 'rosa', 3]]), S(at(2, 12, 5), 'efectivo', 0, [['p10', 'iPhone 16 Pro', 'plateado', 1]]), S(at(4, 17, 30), 'transferencia', 0, [['p1', 'iPhone 16 Pro Max', 'transparente', 1], ['p6', null, 'blanco', 1]]), S(at(9, 11, 0), 'efectivo', 10, [['p5', 'iPhone 15 Pro', 'tornasolado', 2]]), S(at(15, 19, 10), 'transferencia', 0, [['p4', 'iPhone 16', 'naranja', 1]])];
  const suppliers = [{
    id: 'sp1',
    name: 'Importadora Cuyo'
  }, {
    id: 'sp2',
    name: 'Distribuidora Once'
  }, {
    id: 'sp3',
    name: 'Casemanía BA'
  }];
  const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fmt = x => new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(x || 0);
  const shortModel = m => m ? m.replace('iPhone ', '') : '';
  const label = v => [v.model, v.color && norm(v.color) !== 'unico' ? v.color : null].filter(Boolean).join(' · ') || 'Único';
  const matches = (p, v, q) => {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return true;
    const hay = norm([p.name, p.category, v.model, v.color].join(' '));
    return toks.every(t => hay.includes(t));
  };
  const lineOf = model => {
    const l = LINES.find(x => x[1].includes(model));
    return l ? l[0] : null;
  };
  window.ADM_DATA = {
    products,
    sales,
    suppliers,
    categories: CATEGORIES
  };
  window.ADM = {
    LINES,
    MODELS,
    fmt,
    label,
    matches,
    norm,
    shortModel,
    lineOf
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/adminData.js", error: String((e && e.message) || e) }); }

// ui_kits/admin/adminUI.jsx
try { (() => {
// Primitivas del panel (locales al kit): 48px de alto táctil, radio 6px, colores --admin-*.
const admS = {
  label: {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--admin-label)',
    fontWeight: 600,
    color: 'var(--admin-text)',
    marginBottom: 6
  },
  muted: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--admin-meta)',
    color: 'var(--admin-muted)'
  },
  cap: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '.06em',
    textTransform: 'uppercase',
    color: 'var(--admin-muted)'
  },
  mono: {
    fontFamily: 'var(--font-mono)',
    fontVariantNumeric: 'tabular-nums'
  },
  body: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--admin-body)',
    color: 'var(--admin-text)'
  }
};
const kebabToCamel = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]));
function Icon({
  name,
  size = 20,
  stroke = 1.75,
  style
}) {
  const L = window.lucide;
  const node = L && (L.icons && L.icons[name] || L[name]);
  if (!node) return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      flexShrink: 0,
      ...style
    }
  });
  const kids = node[0] === 'svg' ? node[2] : node;
  return /*#__PURE__*/React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: {
      display: 'block',
      flexShrink: 0,
      ...style
    }
  }, kids.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...kebabToCamel(attrs)
  })));
}
function Btn({
  children,
  kind = 'primary',
  size = 'md',
  full,
  icon,
  disabled,
  onClick,
  type = 'button',
  style,
  title
}) {
  const [p, setP] = React.useState(false);
  const h = {
    lg: 'var(--admin-cta-h)',
    md: 'var(--admin-control-h)',
    sm: 'var(--admin-control-h-sm)'
  }[size];
  let [bg, fg, bd] = {
    primary: ['var(--admin-ink)', '#fff', 'var(--admin-ink)'],
    secondary: ['var(--admin-surface)', 'var(--admin-text)', 'var(--admin-border-strong)'],
    danger: ['var(--admin-danger)', '#fff', 'var(--admin-danger)'],
    dangerOutline: ['var(--admin-surface)', 'var(--admin-danger)', 'var(--admin-danger-border)'],
    ghost: ['transparent', 'var(--admin-text)', 'transparent']
  }[kind];
  const solid = kind === 'primary' || kind === 'danger';
  if (disabled && solid) {
    bg = 'var(--admin-disabled-bg)';
    fg = 'var(--admin-disabled-fg)';
    bd = 'var(--admin-disabled-bg)';
  }
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    title: title,
    disabled: disabled,
    onClick: onClick,
    onPointerDown: () => setP(true),
    onPointerUp: () => setP(false),
    onPointerLeave: () => setP(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: h,
      minWidth: h,
      padding: size === 'sm' ? '0 14px' : '0 20px',
      width: full ? '100%' : undefined,
      boxSizing: 'border-box',
      borderRadius: 'var(--admin-radius)',
      border: '1px solid ' + bd,
      background: bg,
      color: fg,
      fontFamily: 'var(--font-body)',
      fontSize: size === 'lg' ? 17 : size === 'sm' ? 14 : 15,
      fontWeight: 600,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled && !solid ? .45 : 1,
      transform: p && !disabled ? 'scale(.98)' : 'none',
      transition: 'transform var(--dur-fast), background var(--dur-fast)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: size === 'lg' ? 22 : 18
  }), children);
}
function IconBtn({
  icon,
  label,
  onClick,
  disabled,
  kind = 'plain',
  size = 44
}) {
  const danger = kind === 'danger';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    title: label,
    onClick: onClick,
    disabled: disabled,
    style: {
      width: size,
      height: size,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--admin-radius)',
      border: kind === 'plain' ? '1px solid transparent' : '1px solid var(--admin-border-strong)',
      background: kind === 'plain' ? 'transparent' : 'var(--admin-surface)',
      color: danger ? 'var(--admin-danger)' : 'var(--admin-text)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? .3 : 1,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20
  }));
}
function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
  suffix,
  inputMode,
  align = 'left',
  autoFocus,
  state,
  mono,
  onEnter,
  style,
  id,
  ariaLabel,
  digits
}) {
  const [f, setF] = React.useState(false);
  const bd = state === 'ok' ? 'var(--admin-ok)' : state === 'error' ? 'var(--admin-danger)' : f || state === 'dirty' ? 'var(--admin-ink)' : 'var(--admin-border-strong)';
  const iconPre = prefix && typeof prefix !== 'string';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      minWidth: 0,
      ...style
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: iconPre ? 14 : 12,
      top: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      color: 'var(--admin-muted)',
      pointerEvents: 'none',
      ...admS.mono,
      fontSize: 15
    }
  }, prefix), /*#__PURE__*/React.createElement("input", {
    id: id,
    "aria-label": ariaLabel,
    type: type,
    inputMode: inputMode || (digits ? 'numeric' : undefined),
    value: value,
    autoFocus: autoFocus,
    placeholder: placeholder,
    onChange: e => onChange && onChange(digits ? e.target.value.replace(/[^\d]/g, '') : e.target.value),
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    onKeyDown: e => {
      if (e.key === 'Enter' && onEnter) onEnter();
    },
    style: {
      height: 'var(--admin-control-h)',
      width: '100%',
      boxSizing: 'border-box',
      borderRadius: 'var(--admin-radius)',
      border: '1px solid ' + bd,
      background: 'var(--admin-surface)',
      paddingLeft: prefix ? iconPre ? 44 : 28 : 14,
      paddingRight: suffix ? 40 : 14,
      textAlign: align,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
      fontVariantNumeric: mono ? 'tabular-nums' : undefined,
      fontSize: 16,
      color: 'var(--admin-text)',
      outline: 'none',
      transition: 'border-color var(--dur-fast)'
    }
  }), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 14,
      top: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      color: 'var(--admin-muted)',
      pointerEvents: 'none',
      ...admS.mono,
      fontSize: 15
    }
  }, suffix));
}
function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  id,
  autoFocus
}) {
  const [f, setF] = React.useState(false);
  return /*#__PURE__*/React.createElement("textarea", {
    id: id,
    rows: rows,
    value: value,
    autoFocus: autoFocus,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value),
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      borderRadius: 'var(--admin-radius)',
      border: '1px solid ' + (f ? 'var(--admin-ink)' : 'var(--admin-border-strong)'),
      background: '#fff',
      padding: 12,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      lineHeight: 1.45,
      color: 'var(--admin-text)',
      outline: 'none',
      resize: 'vertical'
    }
  });
}
function Field({
  label,
  htmlFor,
  hint,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: admS.label
  }, label), children, hint && /*#__PURE__*/React.createElement("p", {
    style: {
      ...admS.muted,
      margin: '6px 0 0'
    }
  }, hint));
}
function SearchInput({
  value,
  onChange,
  placeholder,
  autoFocus
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    prefix: /*#__PURE__*/React.createElement(Icon, {
      name: "Search",
      size: 20
    }),
    type: "search",
    ariaLabel: placeholder,
    autoFocus: autoFocus
  }), value && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 2,
      top: 2
    }
  }, /*#__PURE__*/React.createElement(IconBtn, {
    icon: "X",
    label: "Borrar b\xFAsqueda",
    onClick: () => onChange('')
  })));
}
function NativeSelect({
  value,
  onChange,
  children,
  id,
  ariaLabel
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: id,
    "aria-label": ariaLabel,
    value: value,
    onChange: e => onChange(e.target.value),
    style: {
      height: 'var(--admin-control-h)',
      width: '100%',
      appearance: 'none',
      WebkitAppearance: 'none',
      borderRadius: 'var(--admin-radius)',
      border: '1px solid var(--admin-border-strong)',
      background: '#fff',
      padding: '0 44px 0 14px',
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--admin-text)',
      cursor: 'pointer'
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 14,
      top: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      pointerEvents: 'none',
      color: 'var(--admin-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ChevronDown",
    size: 18
  })));
}
function Seg({
  options,
  value,
  onChange,
  cols,
  h = 'var(--admin-control-h)',
  ariaLabel
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    "aria-label": ariaLabel,
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols || options.length}, minmax(0,1fr))`,
      gap: 8
    }
  }, options.map(o => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      role: "radio",
      "aria-checked": on,
      onClick: () => onChange(o.value),
      style: {
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 'var(--admin-radius)',
        border: '1px solid ' + (on ? 'var(--admin-ink)' : 'var(--admin-border-strong)'),
        background: on ? 'var(--admin-ink)' : '#fff',
        color: on ? '#fff' : 'var(--admin-text)',
        fontFamily: 'var(--font-body)',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        padding: '0 8px',
        whiteSpace: 'nowrap',
        transition: 'background var(--dur-fast), color var(--dur-fast)'
      }
    }, o.icon && /*#__PURE__*/React.createElement(Icon, {
      name: o.icon,
      size: 20
    }), o.label);
  }));
}
function Chip({
  active,
  onClick,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": !!active,
    onClick: onClick,
    style: {
      height: 44,
      flexShrink: 0,
      padding: '0 16px',
      borderRadius: 9999,
      border: '1px solid ' + (active ? 'var(--admin-ink)' : 'var(--admin-border-strong)'),
      background: active ? 'var(--admin-ink)' : '#fff',
      color: active ? '#fff' : 'var(--admin-text)',
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      ...style
    }
  }, children);
}
function ChipRow({
  options,
  value,
  onChange,
  wrap
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      overflowX: wrap ? 'visible' : 'auto',
      flexWrap: wrap ? 'wrap' : 'nowrap',
      margin: wrap ? 0 : '0 -16px',
      padding: wrap ? 0 : '0 16px 2px',
      scrollbarWidth: 'none'
    }
  }, options.map(o => /*#__PURE__*/React.createElement(Chip, {
    key: o.value,
    active: o.value === value,
    onClick: () => onChange(o.value)
  }, o.label)));
}
function Card({
  children,
  pad = 16,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--admin-surface)',
      border: '1px solid var(--admin-border)',
      borderRadius: 'var(--admin-radius)',
      padding: pad,
      boxSizing: 'border-box',
      minWidth: 0,
      ...style
    }
  }, children);
}
function Badge({
  kind = 'neutral',
  children
}) {
  const k = {
    neutral: ['#f5f5f5', 'var(--admin-text)', 'var(--admin-border)'],
    danger: ['var(--admin-danger-bg)', 'var(--admin-danger)', 'var(--admin-danger-border)'],
    ok: ['var(--admin-ok-bg)', 'var(--admin-ok)', '#a7f3d0'],
    ink: ['var(--admin-ink)', '#fff', 'var(--admin-ink)'],
    warn: ['#fffbeb', 'var(--admin-warn)', '#fde68a']
  }[kind];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 22,
      padding: '0 8px',
      borderRadius: 9999,
      background: k[0],
      color: k[1],
      border: '1px solid ' + k[2],
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.04em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap'
    }
  }, children);
}
function Stepper({
  value,
  onChange,
  min = 0,
  max = Infinity
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(IconBtn, {
    kind: "outline",
    icon: "Minus",
    label: "Restar uno",
    onClick: () => onChange(Math.max(min, value - 1)),
    disabled: value <= min
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      minWidth: 32,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: 600,
      color: 'var(--admin-text)'
    }
  }, value), /*#__PURE__*/React.createElement(IconBtn, {
    kind: "outline",
    icon: "Plus",
    label: "Sumar uno",
    onClick: () => onChange(Math.min(max, value + 1)),
    disabled: value >= max
  }));
}
function Sheet({
  open,
  onClose,
  title,
  dk,
  center,
  children,
  width = 440
}) {
  if (!open) return null;
  const mid = dk || center;
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      background: 'rgb(0 0 0 / .45)',
      display: 'flex',
      alignItems: mid ? 'center' : 'flex-end',
      justifyContent: 'center',
      padding: mid ? 16 : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    onClick: e => e.stopPropagation(),
    style: {
      width: mid ? '100%' : 'min(100%, 430px)',
      maxWidth: mid ? width : undefined,
      maxHeight: mid ? '88vh' : '92vh',
      overflowY: 'auto',
      background: '#fff',
      borderRadius: mid ? 8 : '14px 14px 0 0',
      boxSizing: 'border-box'
    }
  }, !mid && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 2,
      background: '#d4d4d4',
      margin: '8px auto 0'
    }
  }), title && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: mid ? '16px 16px 0 24px' : '8px 8px 0 16px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 20,
      letterSpacing: '-.01em',
      color: 'var(--admin-text)'
    }
  }, title), /*#__PURE__*/React.createElement(IconBtn, {
    icon: "X",
    label: "Cerrar",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: mid ? '12px 24px 24px' : '8px 16px 24px'
    }
  }, children))), document.body);
}
function Notice({
  kind = 'ink',
  children,
  onClose
}) {
  const k = {
    ink: ['var(--admin-ink)', '#fff'],
    ok: ['var(--admin-ok-bg)', 'var(--admin-ok)'],
    danger: ['var(--admin-danger-bg)', 'var(--admin-danger)']
  }[kind];
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      padding: '10px 8px 10px 14px',
      borderRadius: 'var(--admin-radius)',
      background: k[0],
      color: k[1],
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1.4,
      border: kind === 'danger' ? '1px solid var(--admin-danger-border)' : 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: kind === 'danger' ? 'CircleAlert' : 'CircleCheck',
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, children), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Cerrar aviso",
    onClick: onClose,
    style: {
      width: 36,
      height: 36,
      border: 0,
      background: 'transparent',
      color: 'inherit',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "X",
    size: 18
  })));
}
function PageTitle({
  children,
  sub,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'var(--admin-title)',
      lineHeight: 1.15,
      letterSpacing: '-.02em',
      color: 'var(--admin-text)'
    }
  }, children), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      ...admS.muted,
      margin: '4px 0 0',
      fontSize: 14
    }
  }, sub)), right);
}
function SectionTitle({
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'var(--admin-section)',
      letterSpacing: '-.01em',
      color: 'var(--admin-text)'
    }
  }, children), right);
}
function Empty({
  children
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      border: '1px dashed var(--admin-border-strong)',
      borderRadius: 'var(--admin-radius)',
      padding: 24,
      textAlign: 'center',
      ...admS.muted,
      fontSize: 14
    }
  }, children);
}
function Thumb({
  src,
  size = 48
}) {
  return src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: size,
      height: size,
      objectFit: 'cover',
      borderRadius: 4,
      flexShrink: 0,
      display: 'block',
      background: 'var(--admin-border)'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: 4,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f0f0',
      color: '#a3a3a3'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "ImageOff",
    size: Math.round(size * .4)
  }));
}
function Row({
  label,
  value,
  strong,
  muted
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      fontFamily: 'var(--font-body)',
      fontSize: strong ? 16 : 15,
      fontWeight: strong ? 700 : 400,
      color: muted ? 'var(--admin-muted)' : 'var(--admin-text)'
    }
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("span", {
    style: {
      ...admS.mono,
      fontWeight: strong ? 700 : 500
    }
  }, value));
}
Object.assign(window, {
  admS,
  Icon,
  Btn,
  IconBtn,
  Input,
  TextArea,
  Field,
  SearchInput,
  NativeSelect,
  Seg,
  Chip,
  ChipRow,
  Card,
  Badge,
  Stepper,
  Sheet,
  Notice,
  PageTitle,
  SectionTitle,
  Empty,
  Thumb,
  Row
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/adminUI.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shared/reservas.js
try { (() => {
// Reservas web compartidas entre la tienda y el panel (localStorage). Alias, CBU y WhatsApp = DATOS DE PRUEBA.
(function () {
  const KEY = 'lf-web-orders-v1',
    EVT = 'lf-web-orders',
    H = 3600e3;
  const CONFIG = {
    alias: 'lafundita.mza',
    cbu: '0000003100012345678901',
    titular: 'La Fundita',
    banco: 'Mercado Pago',
    whatsapp: '5492610000000',
    holdHours: 24,
    test: true
  };
  const fmt = x => new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(x || 0);
  const tot = items => items.reduce((s, i) => s + i.qty * i.price, 0);
  function seed() {
    const t = Date.now(),
      iso = x => new Date(x).toISOString();
    const O = (id, h, status, name, phone, items, extra) => ({
      id,
      createdAt: iso(t - h * H),
      status,
      customer: {
        name,
        phone
      },
      items,
      total: tot(items),
      ...(extra || {})
    });
    return [O('LF-1041', 2, 'pendiente', 'Sofía Martínez', '261 555 1234', [{
      name: 'Cherry Case',
      model: 'iPhone 15',
      color: 'transparente',
      qty: 1,
      price: 18500
    }]), O('LF-1040', 21.5, 'pendiente', 'Julián Pérez', '261 444 9087', [{
      name: 'Wave Case',
      model: 'iPhone 16 Pro',
      color: 'negro',
      qty: 1,
      price: 19900
    }, {
      name: 'Cable USB-C a USB-C',
      model: null,
      color: 'blanco',
      qty: 1,
      price: 8500
    }]), O('LF-1039', 30, 'pendiente', 'Camila Ruiz', '261 333 2211', [{
      name: 'MagCase',
      model: 'iPhone 16 Pro',
      color: 'azul',
      qty: 1,
      price: 15000
    }]), O('LF-1038', 26, 'pagada', 'Martina Gómez', '261 222 7788', [{
      name: 'Smoky Case',
      model: 'iPhone 15 Pro',
      color: 'tornasolado',
      qty: 1,
      price: 19900
    }], {
      paidAt: iso(t - 25 * H)
    }), O('LF-1037', 50, 'cancelada', 'Tomás Díaz', '261 111 4455', [{
      name: 'Star Case',
      model: 'iPhone 16 Pro Max',
      color: 'rosa',
      qty: 1,
      price: 19900
    }], {
      cancelledAt: iso(t - 26 * H),
      cancelReason: 'No mandó el comprobante'
    })];
  }
  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(v)) return v;
    } catch (e) {}
    return null;
  }
  function all() {
    let v = read();
    if (!v) {
      v = seed();
      localStorage.setItem(KEY, JSON.stringify(v));
    }
    return v;
  }
  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVT));
  }
  function get(id) {
    return all().find(o => o.id === id) || null;
  }
  function create({
    customer,
    items
  }) {
    const list = all();
    const max = list.reduce((m, o) => Math.max(m, Number(o.id.replace('LF-', '')) || 0), 1036);
    const o = {
      id: 'LF-' + (max + 1),
      createdAt: new Date().toISOString(),
      status: 'pendiente',
      customer,
      items,
      total: tot(items)
    };
    save([o, ...list]);
    return o;
  }
  const expiresAt = o => new Date(o.createdAt).getTime() + CONFIG.holdHours * H;
  const left = (o, now) => expiresAt(o) - (now || Date.now());
  const reservedFor = name => all().filter(o => o.status !== 'cancelada').reduce((s, o) => s + o.items.filter(i => i.name === name).reduce((a, i) => a + i.qty, 0), 0);
  const leftText = ms => {
    if (ms <= 0) return '0 min';
    const h = Math.floor(ms / H),
      m = Math.floor(ms % H / 60000);
    return h ? `${h} h ${m} min` : `${m} min`;
  };
  function waLink(o) {
    const lines = o.items.map(i => `• ${i.name}${i.model ? ' · ' + i.model : ''}${i.color ? ' · ' + i.color : ''} ×${i.qty}`);
    const msg = `¡Hola La Fundita! Te mando el comprobante de mi reserva ${o.id} por ${fmt(o.total)}.\n${lines.join('\n')}\nA nombre de: ${o.customer.name}`;
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  }
  const customerLink = o => 'https://wa.me/549' + (o.customer.phone || '').replace(/\D/g, '');
  function subscribe(fn) {
    const a = () => fn(all());
    const b = e => {
      if (e.key === KEY) a();
    };
    window.addEventListener(EVT, a);
    window.addEventListener('storage', b);
    return () => {
      window.removeEventListener(EVT, a);
      window.removeEventListener('storage', b);
    };
  }
  window.LF_RES = {
    CONFIG,
    all,
    save,
    get,
    create,
    expiresAt,
    left,
    leftText,
    reservedFor,
    waLink,
    customerLink,
    subscribe,
    fmt
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shared/reservas.js", error: String((e && e.message) || e) }); }

// ui_kits/storefront/CartScreens.jsx
try { (() => {
const cartFmt = x => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
}).format(x || 0);
const cartCap = {
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: 'var(--graphite)'
};
const cartBody = {
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  lineHeight: 1.5,
  color: 'var(--ink)'
};
const cartH1 = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 'var(--text-section)',
  lineHeight: 1.05,
  letterSpacing: 'var(--tracking-tight)',
  color: 'var(--ink)',
  textWrap: 'pretty'
};
const cartWrap = dk => ({
  maxWidth: dk ? 760 : undefined,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 32,
  padding: dk ? '48px var(--page-pad) var(--main-bottom)' : '24px var(--page-pad) var(--main-bottom)'
});
const cartVariant = i => [i.model, i.color].filter(Boolean).join(' · ');
function useNow(ms) {
  const [n, setN] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setN(Date.now()), ms || 30000);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}
function QtyControl({
  value,
  onChange,
  max
}) {
  const b = dis => ({
    width: 44,
    height: 44,
    borderRadius: 9999,
    border: '1px solid var(--rule)',
    background: 'transparent',
    color: 'var(--ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: 20,
    lineHeight: 1,
    cursor: dis ? 'default' : 'pointer',
    opacity: dis ? .3 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Restar uno",
    style: b(value <= 1),
    disabled: value <= 1,
    onClick: () => onChange(value - 1)
  }, "\u2212"), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 28,
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 16,
      fontVariantNumeric: 'tabular-nums'
    }
  }, value), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Sumar uno",
    style: b(value >= max),
    disabled: value >= max,
    onClick: () => onChange(value + 1)
  }, "+"));
}
function StoreField({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  hint
}) {
  const [f, setF] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'block',
      marginBottom: 8,
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      color: 'var(--ink)'
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    id: id,
    type: type,
    inputMode: inputMode,
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value),
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: {
      width: '100%',
      height: 56,
      boxSizing: 'border-box',
      padding: '0 16px',
      borderRadius: 8,
      border: '1px solid ' + (f ? 'var(--ink)' : 'var(--rule)'),
      background: '#fff',
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--ink)',
      outline: 'none'
    }
  }), hint && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--graphite)'
    }
  }, hint));
}
function CartScreen({
  cart,
  go
}) {
  const LF = window.LaFunditaDesignSystem_371b6e,
    dk = !!window.LF_DESKTOP;
  const n = cart.count;
  return /*#__PURE__*/React.createElement("div", {
    style: cartWrap(dk)
  }, /*#__PURE__*/React.createElement(LF.PageHeader, {
    title: "Carrito",
    count: n === 1 ? '1 producto' : `${n} productos`,
    backLabel: "Seguir comprando",
    onBack: e => {
      e.preventDefault();
      go({
        screen: 'home'
      });
    }
  }), n === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      ...cartBody,
      margin: 0,
      color: 'var(--graphite)'
    }
  }, "Tu carrito est\xE1 vac\xEDo."), /*#__PURE__*/React.createElement(LF.Button, {
    onClick: () => go({
      screen: 'category',
      slug: 'de-diseno'
    })
  }, "Ver fundas")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, cart.items.map((i, k) => /*#__PURE__*/React.createElement("li", {
    key: i.key,
    style: {
      display: 'grid',
      gridTemplateColumns: '88px minmax(0,1fr)',
      gap: 16,
      padding: '20px 0',
      borderTop: k ? '1px solid var(--rule)' : 0
    }
  }, i.image ? /*#__PURE__*/React.createElement("img", {
    src: i.image,
    alt: "",
    style: {
      width: 88,
      aspectRatio: '4/5',
      objectFit: 'cover',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 88,
      aspectRatio: '4/5',
      background: 'var(--surface-photo-empty, #ecebe7)',
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 19,
      letterSpacing: '-.01em',
      color: 'var(--ink)'
    }
  }, i.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--graphite)'
    }
  }, cartVariant(i)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 15,
      color: 'var(--ink)'
    }
  }, cartFmt(i.price)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(QtyControl, {
    value: i.qty,
    max: i.max || 99,
    onChange: q => cart.setQty(i.key, q)
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => cart.remove(i.key),
    style: {
      minHeight: 44,
      border: 0,
      background: 'transparent',
      padding: 0,
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--graphite)',
      textDecoration: 'underline',
      textUnderlineOffset: 3,
      cursor: 'pointer'
    }
  }, "Quitar")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ink)',
      paddingTop: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: cartCap
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 32,
      fontWeight: 500,
      color: 'var(--ink)'
    }
  }, cartFmt(cart.total))), /*#__PURE__*/React.createElement("p", {
    style: {
      ...cartBody,
      margin: 0,
      fontSize: 15,
      color: 'var(--graphite)'
    }
  }, "Pag\xE1s por transferencia. Al comprar te reservamos las fundas por 24 horas."), /*#__PURE__*/React.createElement(LF.Button, {
    fullWidth: true,
    onClick: () => go({
      screen: 'checkout'
    })
  }, "Comprar"))));
}
function CheckoutScreen({
  cart,
  go
}) {
  const LF = window.LaFunditaDesignSystem_371b6e,
    dk = !!window.LF_DESKTOP;
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const ok = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 8;
  if (!cart.count) return /*#__PURE__*/React.createElement(CartScreen, {
    cart: cart,
    go: go
  });
  const submit = () => {
    const o = window.LF_RES.create({
      customer: {
        name: name.trim(),
        phone: phone.trim()
      },
      items: cart.items.map(({
        name,
        model,
        color,
        qty,
        price
      }) => ({
        name,
        model,
        color,
        qty,
        price
      }))
    });
    cart.clear();
    go({
      screen: 'reserva',
      id: o.id
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: cartWrap(dk)
  }, /*#__PURE__*/React.createElement(LF.PageHeader, {
    title: "Finalizar compra",
    backLabel: "Carrito",
    onBack: e => {
      e.preventDefault();
      go({
        screen: 'cart'
      });
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(StoreField, {
    id: "co-name",
    label: "Tu nombre",
    value: name,
    onChange: setName,
    placeholder: "Nombre y apellido"
  }), /*#__PURE__*/React.createElement(StoreField, {
    id: "co-phone",
    label: "Tu WhatsApp",
    value: phone,
    onChange: setPhone,
    type: "tel",
    inputMode: "tel",
    placeholder: "261 555 1234",
    hint: "Te escribimos por ac\xE1 para confirmar el pago y coordinar la entrega."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--rule)',
      paddingTop: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, cart.items.map(i => /*#__PURE__*/React.createElement("div", {
    key: i.key,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, i.name, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--graphite)'
    }
  }, "\xB7 ", cartVariant(i), " \xD7", i.qty)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      flexShrink: 0
    }
  }, cartFmt(i.qty * i.price)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      borderTop: '1px solid var(--ink)',
      paddingTop: 16,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: cartCap
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 28,
      fontWeight: 500,
      color: 'var(--ink)'
    }
  }, cartFmt(cart.total)))), /*#__PURE__*/React.createElement(LF.Button, {
    fullWidth: true,
    disabled: !ok,
    onClick: submit
  }, "Reservar y ver datos de pago"));
}
function CopyRow({
  label,
  value
}) {
  const [done, setDone] = React.useState(false);
  const copy = () => {
    try {
      navigator.clipboard && navigator.clipboard.writeText(value);
    } catch (e) {}
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '16px 0',
      borderTop: '1px solid var(--rule)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...cartCap,
      display: 'block',
      marginBottom: 4
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: label === 'CBU' ? 15 : 20,
      color: 'var(--ink)',
      overflowWrap: 'anywhere'
    }
  }, value)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: copy,
    style: {
      flexShrink: 0,
      height: 44,
      padding: '0 18px',
      borderRadius: 9999,
      border: '1px solid ' + (done ? 'var(--ink)' : 'var(--rule)'),
      background: done ? 'var(--ink)' : 'transparent',
      color: done ? 'var(--paper)' : 'var(--ink)',
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      fontWeight: 500,
      cursor: 'pointer'
    }
  }, done ? 'Copiado' : 'Copiar'));
}
function ReservaScreen({
  id,
  go
}) {
  const LF = window.LaFunditaDesignSystem_371b6e,
    R = window.LF_RES,
    C = R.CONFIG,
    dk = !!window.LF_DESKTOP;
  const now = useNow(30000);
  const [o, setO] = React.useState(() => R.get(id));
  React.useEffect(() => R.subscribe(() => setO(R.get(id))), [id]);
  if (!o) return /*#__PURE__*/React.createElement("div", {
    style: cartWrap(dk)
  }, /*#__PURE__*/React.createElement("p", {
    style: cartBody
  }, "No encontramos esa reserva."), /*#__PURE__*/React.createElement(LF.Button, {
    onClick: () => go({
      screen: 'home'
    })
  }, "Volver a la tienda"));
  const ms = R.left(o, now),
    expired = o.status === 'pendiente' && ms <= 0;
  const state = o.status === 'pagada' ? ['¡Pago confirmado!', 'Ya recibimos tu transferencia. Te escribimos por WhatsApp para coordinar la entrega.'] : o.status === 'cancelada' ? ['Esta reserva se canceló', 'Las fundas volvieron a estar disponibles. Si querés, armá un carrito nuevo.'] : expired ? ['La reserva venció', 'Pasaron las 24 horas. Escribinos por WhatsApp y vemos si todavía hay stock.'] : null;
  return /*#__PURE__*/React.createElement("div", {
    style: cartWrap(dk)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: cartCap
  }, "Reserva ", o.id), /*#__PURE__*/React.createElement("h1", {
    style: cartH1
  }, state ? state[0] : 'Transferí y mandanos el comprobante'), state && /*#__PURE__*/React.createElement("p", {
    style: {
      ...cartBody,
      margin: 0,
      color: 'var(--graphite)'
    }
  }, state[1])), !state && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ink)',
      color: 'var(--paper)',
      padding: '20px var(--page-pad)',
      margin: dk ? 0 : '0 calc(var(--page-pad) * -1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 15
    }
  }, "Te guardamos tus fundas por 24 horas."), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 22
    }
  }, "Quedan ", R.leftText(ms))), o.status === 'pendiente' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      ...cartCap,
      display: 'block',
      marginBottom: 6
    }
  }, "Total a transferir"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 44,
      fontWeight: 500,
      lineHeight: 1,
      color: 'var(--ink)'
    }
  }, cartFmt(o.total))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid var(--rule)'
    }
  }, /*#__PURE__*/React.createElement(CopyRow, {
    label: "Alias",
    value: C.alias
  }), /*#__PURE__*/React.createElement(CopyRow, {
    label: "CBU",
    value: C.cbu
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      padding: '12px 0 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--graphite)'
    }
  }, "Titular: ", C.titular, " \xB7 ", C.banco, C.test ? ' · datos de prueba' : '')), /*#__PURE__*/React.createElement("ol", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      counterReset: 'st'
    }
  }, ['Transferí el total al alias o al CBU.', 'Mandanos el comprobante por WhatsApp.', 'Te confirmamos el pago y coordinamos la entrega.'].map((t, k) => /*#__PURE__*/React.createElement("li", {
    key: k,
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'baseline',
      ...cartBody,
      fontSize: 15
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 20,
      width: 18
    }
  }, k + 1), t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, o.status !== 'cancelada' && /*#__PURE__*/React.createElement(LF.Button, {
    fullWidth: true,
    onClick: () => window.open(R.waLink(o), '_blank', 'noopener')
  }, o.status === 'pendiente' && !expired ? 'Mandar comprobante a WhatsApp' : 'Escribirnos por WhatsApp'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go({
      screen: 'home'
    }),
    style: {
      minHeight: 48,
      border: 0,
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--ink)',
      textDecoration: 'underline',
      textUnderlineOffset: 3,
      cursor: 'pointer'
    }
  }, "Volver a la tienda")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--rule)',
      paddingTop: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: cartCap
  }, "Tu pedido"), o.items.map((i, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("span", null, i.name, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--graphite)'
    }
  }, "\xB7 ", cartVariant(i), " \xD7", i.qty)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, cartFmt(i.qty * i.price))))));
}
function CartBar({
  cart,
  go
}) {
  const dk = !!window.LF_DESKTOP;
  if (!cart.count) return null;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go({
      screen: 'cart'
    }),
    style: {
      position: 'fixed',
      zIndex: 40,
      bottom: 16,
      ...(dk ? {
        right: 32,
        width: 360
      } : {
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(min(100%, 430px) - 32px)'
      }),
      height: 60,
      borderRadius: 9999,
      border: 0,
      background: 'var(--ink)',
      color: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      cursor: 'pointer',
      boxShadow: '0 10px 30px rgb(0 0 0 / .22)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      fontWeight: 500
    }
  }, "Ver carrito (", cart.count, ")"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 17
    }
  }, cartFmt(cart.total)));
}
function useCart() {
  const [items, setItems] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lf-cart')) || [];
    } catch (e) {
      return [];
    }
  });
  const put = fn => setItems(prev => {
    const n = fn(prev);
    localStorage.setItem('lf-cart', JSON.stringify(n));
    return n;
  });
  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * i.price, 0),
    add: it => put(c => c.some(i => i.key === it.key) ? c.map(i => i.key === it.key ? {
      ...i,
      qty: Math.min(i.max || 99, i.qty + 1)
    } : i) : [...c, it]),
    setQty: (key, qty) => put(c => c.map(i => i.key === key ? {
      ...i,
      qty
    } : i)),
    remove: key => put(c => c.filter(i => i.key !== key)),
    clear: () => put(() => [])
  };
}
Object.assign(window, {
  CartScreen,
  CheckoutScreen,
  ReservaScreen,
  CartBar,
  useCart
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/CartScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/storefront/CatalogScreens.jsx
try { (() => {
const LF = window.LaFunditaDesignSystem_371b6e;
const lfCols = n => window.LF_DESKTOP ? 'repeat(' + n + ', minmax(0,1fr))' : '1fr 1fr';
function ProductGrid({
  items,
  go,
  model
}) {
  const D = window.LF_DATA,
    A = '../../assets/';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: lfCols(4),
      columnGap: 'var(--tile-gap)',
      rowGap: window.LF_DESKTOP ? 48 : 28
    }
  }, items.map(p => /*#__PURE__*/React.createElement(LF.ProductTile, {
    key: p.id,
    name: p.name,
    price: (model ? '' : 'Desde ') + D.fmt(p.price),
    image: p.images[0] ? A + p.images[0] : null,
    onClick: e => {
      e.preventDefault();
      go({
        screen: 'product',
        id: p.id,
        model
      });
    }
  })));
}
function CategoryScreen({
  slug,
  go
}) {
  const D = window.LF_DATA;
  const cat = D.categories.find(c => c.slug === slug) || D.categories[0];
  const [model, setModel] = React.useState('');
  const items = D.products.filter(p => p.cat === cat.slug && (!model || p.models.includes(model)));
  const back = e => {
    e.preventDefault();
    go(cat.sub ? {
      screen: 'category',
      slug: cat.sub
    } : {
      screen: 'home'
    });
  };
  const wrap = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--page-gap)',
    padding: 'var(--main-top) var(--page-pad) var(--main-bottom)'
  };
  if (cat.subs) {
    const subs = cat.subs.map(s => D.categories.find(c => c.slug === s));
    return /*#__PURE__*/React.createElement("div", {
      style: wrap
    }, /*#__PURE__*/React.createElement(LF.PageHeader, {
      title: cat.name,
      count: subs.length + ' tipos',
      onBack: back
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: lfCols(3),
        gap: 'var(--tile-gap)',
        margin: window.LF_DESKTOP ? 0 : '0 calc(var(--page-pad) * -1)'
      }
    }, subs.map((s, i) => /*#__PURE__*/React.createElement(LF.CategoryTile, {
      key: s.slug,
      name: s.name,
      index: i + 1,
      image: s.image,
      onClick: e => {
        e.preventDefault();
        go({
          screen: 'category',
          slug: s.slug
        });
      }
    }))));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: wrap
  }, /*#__PURE__*/React.createElement(LF.PageHeader, {
    parent: cat.parent,
    title: cat.name,
    count: items.length,
    countSuffix: model ? 'para ' + model : undefined,
    backLabel: cat.sub ? 'Accesorios' : 'Inicio',
    onBack: back
  }), !cat.universal && /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: window.LF_DESKTOP ? 360 : 'none'
    }
  }, /*#__PURE__*/React.createElement(LF.Select, {
    label: "Eleg\xED tu iPhone",
    placeholder: "Todos los modelos",
    value: model,
    onChange: setModel,
    options: D.allModels
  })), items.length === 0 ? /*#__PURE__*/React.createElement(LF.EmptyState, null, model ? 'No hay productos disponibles para ' + model + ' en esta categoría.' : 'No hay productos disponibles en esta categoría por el momento.') : /*#__PURE__*/React.createElement(ProductGrid, {
    items: items,
    go: go,
    model: model || undefined
  }));
}
function ModelScreen({
  model,
  go
}) {
  const D = window.LF_DATA;
  const items = D.products.filter(p => p.models.includes(model));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--page-gap)',
      padding: 'var(--main-top) var(--page-pad) var(--main-bottom)'
    }
  }, /*#__PURE__*/React.createElement(LF.PageHeader, {
    title: model,
    count: items.length,
    onBack: e => {
      e.preventDefault();
      go({
        screen: 'home'
      });
    }
  }), items.length === 0 ? /*#__PURE__*/React.createElement(LF.EmptyState, null, "No hay productos disponibles para ", model, " por el momento.") : /*#__PURE__*/React.createElement(ProductGrid, {
    items: items,
    go: go,
    model: model
  }));
}
function AboutScreen() {
  const dk = !!window.LF_DESKTOP;
  const prose = /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--measure-prose)',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: 'var(--text-lead)',
      lineHeight: 'var(--leading-relaxed)',
      color: 'var(--graphite)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "La Fundita nace de las ganas de vestir tu iPhone con algo que realmente se sienta tuyo: fundas y accesorios elegidos y armados a mano, uno por uno."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "Vendemos en ferias y por WhatsApp, as\xED que si ten\xE9s dudas de stock, combinaciones de color o quer\xE9s encargar algo puntual, el mejor camino es escribirnos directo."));
  const photo = /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '4/5',
      margin: dk ? 0 : '0 calc(var(--page-pad) * -1)',
      background: 'url(../../assets/photos/coleccion-flatlay-b.jpg) center/cover'
    }
  });
  const note = /*#__PURE__*/React.createElement(LF.EmptyState, {
    align: "left"
  }, "Ac\xE1 van los datos de contacto reales (WhatsApp / Instagram).");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--page-gap)',
      padding: 'var(--main-top) var(--page-pad) var(--main-bottom)'
    }
  }, /*#__PURE__*/React.createElement(LF.PageHeader, {
    title: "Nosotros",
    showBack: false
  }), dk ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      gap: 64,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--page-gap)'
    }
  }, prose, note), photo) : /*#__PURE__*/React.createElement(React.Fragment, null, prose, photo, note));
}
Object.assign(window, {
  CategoryScreen,
  ModelScreen,
  AboutScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/CatalogScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/storefront/HomeScreen.jsx
try { (() => {
const {
  HeroCarousel,
  RangeHero,
  ModelStrip,
  SectionHeading,
  CategoryTile,
  ProductTile,
  ArrowMark
} = window.LaFunditaDesignSystem_371b6e;
function HomeScreen({
  go
}) {
  const D = window.LF_DATA,
    A = '../../assets/',
    dk = !!window.LF_DESKTOP;
  const lab = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase'
  };
  const toCat = slug => e => {
    e.preventDefault();
    go({
      screen: 'category',
      slug
    });
  };
  const cta = (txt, slug) => /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: toCat(slug),
    style: {
      ...lab,
      color: 'var(--paper)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      minHeight: 44
    }
  }, txt, " ", /*#__PURE__*/React.createElement(ArrowMark, null));
  const scrimTop = o => 'linear-gradient(to bottom, rgb(18 18 18 / ' + o + '), transparent 50%)';
  const h2 = fs => ({
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: dk ? fs * 2 : fs,
    lineHeight: .95,
    letterSpacing: 'var(--tracking-page)',
    maxWidth: '10ch'
  });
  const top = {
    position: 'absolute',
    inset: 0,
    padding: dk ? '72px var(--page-pad)' : '32px var(--page-pad)',
    color: 'var(--paper)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  };
  const slides = [{
    src: A + 'photos/marble-cases.jpg',
    alt: 'Fundas tornasoladas sobre mesa de madera',
    content: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgb(18 18 18 / .78) 0%, rgb(18 18 18 / .35) 45%, rgb(18 18 18 / .05) 75%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: dk ? '0 var(--page-pad) 72px' : '0 var(--page-pad) 48px',
        '--text-hero': dk ? 'clamp(5rem, 10vw, 10.5rem)' : 'min(3.9rem, 15.2vw)',
        '--text-lead': dk ? '1.375rem' : '.9375rem',
        '--measure-lead': dk ? undefined : '30ch'
      }
    }, /*#__PURE__*/React.createElement(RangeHero, {
      tone: "paper",
      from: "iPhone 11",
      to: "18 Pro Max",
      animate: false,
      lead: dk ? 'Fundas y accesorios para tu iPhone. Elegí tu modelo y mirá lo que hay en stock.' : 'Fundas y accesorios para tu iPhone.'
    }))
  }, {
    src: A + 'photos/magsafe-colores-mesa.jpg',
    alt: 'Fundas de colores sobre mesa',
    content: /*#__PURE__*/React.createElement("div", {
      style: {
        ...top,
        background: scrimTop(.6)
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...lab,
        color: 'var(--paper-85)'
      }
    }, "Fundas de dise\xF1o"), /*#__PURE__*/React.createElement("h2", {
      style: h2(42)
    }, "Fundas con dise\xF1o para vos."), cta('Ver más', 'de-diseno'))
  }, {
    src: A + 'photos/coleccion-flatlay-a.jpg',
    alt: 'Colección de fundas sobre mesa',
    content: /*#__PURE__*/React.createElement("div", {
      style: {
        ...top,
        gap: 20,
        background: scrimTop(.6)
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: h2(48)
    }, "Tu iPhone, pero m\xE1s vos."), cta('Ver todo', 'de-diseno'))
  }, {
    src: A + 'photos/wave-cases-mesa.jpg',
    dim: .55,
    alt: 'Fundas de olas sobre mesa de madera',
    position: 'center 40%',
    content: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-end',
        padding: dk ? '0 var(--page-pad) 72px' : '0 var(--page-pad) 72px'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: A + 'logo-transparent.png',
      alt: "La Fundita",
      style: {
        width: dk ? '30%' : '72%',
        maxWidth: 520,
        height: 'auto',
        marginLeft: dk ? '-3%' : '-8%'
      }
    }))
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--section-gap)',
      paddingBottom: 'var(--main-bottom)'
    }
  }, /*#__PURE__*/React.createElement(HeroCarousel, {
    aspect: dk ? "1584/722" : "4/5",
    objectPosition: "center",
    slides: slides
  }), /*#__PURE__*/React.createElement(ModelStrip, {
    lines: D.lines,
    onSelectModel: m => go({
      screen: 'model',
      model: m.name
    })
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--page-pad)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    size: "headline",
    title: "Eleg\xED por categor\xEDa"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'repeat(4, minmax(0,1fr))' : '1fr 1fr',
      gap: 'var(--tile-gap)',
      padding: dk ? '0 var(--page-pad)' : 0
    }
  }, D.categories.filter(c => !c.sub).map((c, i) => /*#__PURE__*/React.createElement(CategoryTile, {
    key: c.slug,
    name: c.name,
    index: i + 1,
    image: c.image ? A + c.image : null,
    onClick: e => {
      e.preventDefault();
      go({
        screen: 'category',
        slug: c.slug
      });
    }
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: '0 var(--page-pad)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeading, {
    label: "Colecci\xF3n destacada",
    title: "Reci\xE9n llegados."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: dk ? 'repeat(4, minmax(0,1fr))' : '1fr 1fr',
      columnGap: 'var(--tile-gap)',
      rowGap: dk ? 48 : 28
    }
  }, D.products.slice(0, 4).map(p => /*#__PURE__*/React.createElement(ProductTile, {
    key: p.id,
    name: p.name,
    price: 'Desde ' + D.fmt(p.price),
    image: p.images[0] ? A + p.images[0] : null,
    onClick: e => {
      e.preventDefault();
      go({
        screen: 'product',
        id: p.id
      });
    }
  })))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/storefront/ProductScreen.jsx
try { (() => {
function ProductScreen({
  id,
  model: initialModel,
  go,
  cart
}) {
  const LF = window.LaFunditaDesignSystem_371b6e,
    D = window.LF_DATA,
    A = '../../assets/';
  const p = D.products.find(x => x.id === id) || D.products[0];
  const [model, setModel] = React.useState(initialModel && p.models.includes(initialModel) ? initialModel : p.models[0]);
  const [color, setColor] = React.useState(p.colors[0]);
  const cat = D.categories.find(c => c.slug === p.cat);
  const dk = !!window.LF_DESKTOP;
  const stock = Math.max(0, p.stock - (window.LF_RES ? window.LF_RES.reservedFor(p.name) : 0));
  const [added, setAdded] = React.useState(false);
  React.useEffect(() => setAdded(false), [model, color]);
  const add = () => {
    if (!cart) return;
    cart.add({
      key: p.id + '|' + (model || '') + '|' + color,
      id: p.id,
      name: p.name,
      model: p.models.length ? model : null,
      color,
      price: p.price,
      qty: 1,
      max: stock,
      image: p.images[0] ? A + p.images[0] : null
    });
    setAdded(true);
  };
  const lab = {
    display: 'block',
    marginBottom: 8,
    fontFamily: 'var(--font-body)',
    fontWeight: 500
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 'var(--main-bottom)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: dk ? '32px var(--page-pad) 24px' : '16px var(--page-pad) 12px'
    }
  }, /*#__PURE__*/React.createElement(LF.BackLink, {
    onClick: e => {
      e.preventDefault();
      go({
        screen: 'category',
        slug: p.cat
      });
    }
  }, cat ? cat.name : 'Inicio')), /*#__PURE__*/React.createElement("div", {
    style: dk ? {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,7fr) minmax(0,5fr)',
      gap: 64,
      padding: '0 var(--page-pad)',
      alignItems: 'start'
    } : {}
  }, /*#__PURE__*/React.createElement(LF.ProductGallery, {
    images: p.images.map(i => A + i),
    alt: p.name
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      padding: dk ? '16px 0 0' : '32px var(--page-pad) 0',
      position: dk ? 'sticky' : 'static',
      top: 112
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'var(--text-section)',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-tight)'
    }
  }, p.name), p.desc && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '8px 0 0',
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      color: 'var(--graphite)'
    }
  }, p.desc)), p.models.length > 0 && /*#__PURE__*/React.createElement(LF.Select, {
    label: "Eleg\xED tu modelo",
    value: model,
    onChange: setModel,
    options: p.models
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: lab
  }, "Color"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8
    }
  }, p.colors.map(c => /*#__PURE__*/React.createElement(LF.Chip, {
    key: c,
    selected: c === color,
    onClick: () => setColor(c)
  }, c)))), /*#__PURE__*/React.createElement(LF.PriceBlock, {
    price: p.price,
    stock: stock,
    sku: (p.id.slice(0, 3) + '-' + (model || 'U').replace('iPhone ', '').replace(/ /g, '') + '-' + color.slice(0, 2)).toUpperCase()
  }), /*#__PURE__*/React.createElement(LF.Button, {
    fullWidth: true,
    disabled: stock === 0,
    onClick: add
  }, stock === 0 ? 'Sin stock' : 'Agregar al carrito'), added && /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: -8,
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Agregado al carrito."), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go({
      screen: 'cart'
    }),
    style: {
      minHeight: 44,
      border: 0,
      background: 'transparent',
      padding: 0,
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--ink)',
      textDecoration: 'underline',
      textUnderlineOffset: 3,
      cursor: 'pointer'
    }
  }, "Ver carrito")))));
}
window.ProductScreen = ProductScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/ProductScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/storefront/StoreApp.jsx
try { (() => {
const {
  SiteHeader
} = window.LaFunditaDesignSystem_371b6e;
function App() {
  const dk = !!window.LF_DESKTOP,
    KEY = dk ? 'lf-kit-route-desk' : 'lf-kit-route';
  const [route, setRoute] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {
        screen: 'home'
      };
    } catch (e) {
      return {
        screen: 'home'
      };
    }
  });
  const cart = useCart();
  const go = r => {
    setRoute(r);
    localStorage.setItem(KEY, JSON.stringify(r));
    window.scrollTo(0, 0);
  };
  const onNav = l => {
    if (l.key === 'home') return go({
      screen: 'home'
    });
    if (l.key === 'nosotros') return go({
      screen: 'about'
    });
    if (l.key === 'fundas') return go({
      screen: 'category',
      slug: 'de-diseno'
    });
    go({
      screen: 'category',
      slug: l.key
    });
  };
  const links = window.LF_DATA.nav.map(l => ({
    ...l,
    href: '#'
  }));
  let body;
  if (route.screen === 'category') body = /*#__PURE__*/React.createElement(CategoryScreen, {
    key: route.slug,
    slug: route.slug,
    go: go
  });else if (route.screen === 'model') body = /*#__PURE__*/React.createElement(ModelScreen, {
    model: route.model,
    go: go
  });else if (route.screen === 'product') body = /*#__PURE__*/React.createElement(ProductScreen, {
    key: route.id,
    id: route.id,
    model: route.model,
    go: go,
    cart: cart
  });else if (route.screen === 'about') body = /*#__PURE__*/React.createElement(AboutScreen, null);else if (route.screen === 'cart') body = /*#__PURE__*/React.createElement(CartScreen, {
    cart: cart,
    go: go
  });else if (route.screen === 'checkout') body = /*#__PURE__*/React.createElement(CheckoutScreen, {
    cart: cart,
    go: go
  });else if (route.screen === 'reserva') body = /*#__PURE__*/React.createElement(ReservaScreen, {
    id: route.id,
    go: go
  });else body = /*#__PURE__*/React.createElement(HomeScreen, {
    go: go
  });
  const hideBar = ['cart', 'checkout', 'reserva'].includes(route.screen);
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": route.screen
  }, /*#__PURE__*/React.createElement(SiteHeader, {
    layout: dk ? 'desktop' : 'mobile',
    links: links,
    logoSrc: "../../assets/logo-black.jpg",
    onNavigate: onNav
  }), body, !hideBar && /*#__PURE__*/React.createElement(CartBar, {
    cart: cart,
    go: go
  }));
}
ReactDOM.createRoot(document.getElementById('app')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/StoreApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/storefront/data.js
try { (() => {
// Datos de muestra. Categorías y modelos = seed real del repo; precios/stock = ejemplo.
window.LF_DATA = function () {
  const P = 'photos/';
  const lines = [{
    label: '11',
    models: ['iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max']
  }, {
    label: '12',
    models: ['iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max']
  }, {
    label: '13',
    models: ['iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max']
  }, {
    label: '14',
    models: ['iPhone 14', 'iPhone 14 Pro', 'iPhone 14 Pro Max']
  }, {
    label: '15',
    models: ['iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max']
  }, {
    label: '16',
    models: ['iPhone 16', 'iPhone 16 Pro', 'iPhone 16 Pro Max']
  }, {
    label: '17',
    models: ['iPhone 17', 'iPhone 17 Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max']
  }, {
    label: '18',
    models: ['iPhone 18', 'iPhone 18 Air', 'iPhone 18 Pro', 'iPhone 18 Pro Max']
  }].map(l => ({
    label: l.label,
    models: l.models.map(n => ({
      name: n
    }))
  }));
  const allModels = lines.flatMap(l => l.models.map(m => m.name));
  const categories = [{
    slug: 'de-diseno',
    name: 'De diseño',
    parent: 'Fundas',
    image: P + 'star-cases.jpg'
  }, {
    slug: 'transparentes',
    name: 'Transparentes',
    parent: 'Fundas',
    image: P + 'cherry-cases.jpg'
  }, {
    slug: 'de-silicona',
    name: 'De silicona',
    parent: 'Fundas',
    image: P + 'magsafe-colores-mesa.jpg'
  }, {
    slug: 'accesorios',
    name: 'Accesorios',
    image: null,
    subs: ['straps', 'protector-cargador', 'lentes-camara']
  }, {
    slug: 'cargadores',
    name: 'Cargadores y cables',
    image: null,
    universal: true
  }, {
    slug: 'straps',
    name: 'Straps',
    parent: 'Accesorios',
    sub: 'accesorios',
    image: null,
    universal: true
  }, {
    slug: 'protector-cargador',
    name: 'Protector de cargador',
    parent: 'Accesorios',
    sub: 'accesorios',
    image: null,
    universal: true
  }, {
    slug: 'lentes-camara',
    name: 'Lentes de cámara',
    parent: 'Accesorios',
    sub: 'accesorios',
    image: null
  }];
  const mk = (id, name, cat, imgs, price, models, colors, stock, desc) => ({
    id,
    name,
    cat,
    images: imgs.map(i => P + i),
    price,
    models,
    colors,
    stock,
    desc
  });
  const pro = ['iPhone 13 Pro', 'iPhone 14 Pro', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Pro Max'];
  const products = [mk('cherry', 'Cherry Case', 'transparentes', ['cherry-cases.jpg', 'coleccion-flatlay-a.jpg', 'coleccion-flatlay-b.jpg'], 18500, pro, ['transparente'], 2, 'Transparente con cerezas estampadas y bordes plateados.'), mk('wave', 'Wave Case', 'de-diseno', ['wave-cases-mesa.jpg', 'coleccion-flatlay-a.jpg'], 19900, pro, ['rosa', 'negro', 'azul', 'gris'], 8, 'Relieve ondulado con marco metalizado.'), mk('star', 'Star Case', 'de-diseno', ['star-cases.jpg'], 19900, ['iPhone 15 Pro', 'iPhone 16 Pro Max'], ['rosa'], 1, null), mk('magcase', 'MagCase', 'de-silicona', ['magsafe-colores-mesa.jpg', 'coleccion-flatlay-b.jpg'], 15000, allModels.slice(6), ['azul', 'blanco', 'naranja'], 12, 'Compatible con MagSafe. Tacto mate.'), mk('smoky', 'Smoky Case', 'de-diseno', ['marble-cases.jpg'], 19900, pro, ['gris', 'verde'], 5, null), mk('cargador-20w', 'Cargador 20 W', 'cargadores', [], 12000, [], ['blanco'], 10, 'Cabezal USB-C de carga rápida. Sirve para todos los iPhone.'), mk('cable-c-lightning', 'Cable USB-C a Lightning', 'cargadores', [], 8500, [], ['blanco'], 10, 'Para iPhone 11 a 14.'), mk('cable-c-c', 'Cable USB-C a USB-C', 'cargadores', [], 8500, [], ['blanco'], 10, 'Para iPhone 15 en adelante.'), mk('cargador-completo', 'Cargador completo', 'cargadores', [], 18000, [], ['blanco'], 6, 'Cabezal 20 W + cable a elección.'), mk('strap-corto', 'Strap corto', 'straps', [], 9000, [], ['negro', 'rosa', 'blanco'], 8, null), mk('strap-cruzado', 'Strap cruzado', 'straps', [], 11000, [], ['negro', 'beige'], 5, null), mk('protector-cable', 'Protector de cargador', 'protector-cargador', [], 3500, [], ['multicolor'], 15, 'Protege la punta del cable para que no se corte.'), mk('lentes', 'Protector de lentes de cámara', 'lentes-camara', [], 7000, allModels, ['transparente', 'negro', 'plateado'], 9, 'Elegí tu modelo: cada iPhone tiene su módulo de cámara.'), mk('estelar', 'Estelar Case', 'de-diseno', ['coleccion-flatlay-b.jpg'], 21000, pro, ['multicolor'], 4, null)];
  return {
    lines,
    allModels,
    categories,
    products,
    fmt: n => new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(n),
    nav: [{
      key: 'fundas',
      label: 'Fundas'
    }, {
      key: 'accesorios',
      label: 'Accesorios'
    }, {
      key: 'cargadores',
      label: 'Cargadores y cables'
    }, {
      key: 'nosotros',
      label: 'Nosotros'
    }]
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/storefront/data.js", error: String((e && e.message) || e) }); }

__ds_ns.ArrowMark = __ds_scope.ArrowMark;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.CategoryTile = __ds_scope.CategoryTile;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.HeroCarousel = __ds_scope.HeroCarousel;

__ds_ns.ModelStrip = __ds_scope.ModelStrip;

__ds_ns.PriceBlock = __ds_scope.PriceBlock;

__ds_ns.ProductGallery = __ds_scope.ProductGallery;

__ds_ns.ProductTile = __ds_scope.ProductTile;

__ds_ns.RangeHero = __ds_scope.RangeHero;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.BackLink = __ds_scope.BackLink;

__ds_ns.PageHeader = __ds_scope.PageHeader;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.SiteHeader = __ds_scope.SiteHeader;

})();
