# UI kit — Tienda (catálogo público, mobile-first)

Recreación click-through del catálogo de `frontend/src/app` (Next.js) del repo matiFernandezz/lafunditamendoza, a 390px.

Pantallas: Home (`page.tsx`), Categoría (`categoria/[slug]`), Modelo (`modelo/[slug]`), Producto (`producto/[id]` + `ProductDetail`), Nosotros.

- `index.html` — shell + router en estado (persistido en localStorage).
- `HomeScreen.jsx` · `CatalogScreens.jsx` · `ProductScreen.jsx` — pantallas; componen los componentes del sistema.
- `data.js` — categorías y 22 modelos reales del seed; **precios, stock y asignación foto↔producto son de muestra**.

Desvíos intencionales respecto del código (pedidos por la marca): fotos en rectángulos sin redondeo; hero con titular propio en Space Grotesk en vez del render con texto quemado; /admin no se incluye (herramienta interna).
