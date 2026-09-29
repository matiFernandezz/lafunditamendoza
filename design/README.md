# La Fundita — Design System

La Fundita vende **fundas y accesorios para iPhone** (fundas transparentes, de diseño y de silicona; vidrios templados, lentes de cámara, straps, fundas para cargador, cargadores y cables). Vende en ferias y por WhatsApp; la web es un **catálogo público organizado por modelo de iPhone** (iPhone 11 → 18 Pro Max; el Air va dentro de la línea 17; la 18 incluye 18, 18 Air, 18 Pro y 18 Pro Max). Accesorios y Cargadores y cables no piden modelo, salvo Lentes de cámara que muestra stock y precio real y deriva la compra a WhatsApp. Casi todo el tráfico llega **desde el celular**: el sistema se piensa mobile-first.

Superficies:
- **Tienda / catálogo público** (Next.js 16 + Tailwind v4 + Supabase) — home, categoría, modelo, producto, nosotros. → `ui_kits/storefront/`
- **/admin** (login, ventas, historial, compras, nuevo producto, catálogo) — herramienta interna, mobile primero, con paleta propia `--admin-*` (`tokens/admin.css`). → `ui_kits/admin/` (`index.html` mobile, `desktop.html`)

## Fuentes
- GitHub: **https://github.com/matiFernandezz/lafunditamendoza** (rama `main`). Clave: `DESIGN.md`, `PRODUCT.md`, `frontend/src/app/globals.css`, `frontend/src/components/*`, `frontend/src/app/**/page.tsx`, `supabase/seed.sql`. Explorá el repo para afinar cualquier diseño nuevo.
- Uploads: `home_mockup.png` (mockup desktop de la home), `modelo_mockup.png` (hero tipográfico "iPhone 11 → 17 Pro Max"), logos (`logoConFondo.jpeg`, `logoSinFondo.png`), 7 fotos reales de producto (WhatsApp), y 2 capturas de referencia de otra marca (Muse: buscador por modelo y vista de producto) — **sólo referencia funcional, no de estilo**.
- Indicaciones de la marca: Space Grotesk para todos los títulos y números de modelo; sans liviana para el apoyo; logo tal cual; estilo editorial con títulos grandes, mucho aire y fotos grandes en rectángulos simples; mobile primero.

## Índice
- `styles.css` — entrada global (sólo `@import`).
- `tokens/` — `admin.css` (panel), `colors.css`, `typography.css`, `spacing.css`, `shape-motion.css`, `base.css`.
- `guidelines/` — tarjetas de fundamentos (Colors, Type, Spacing, Brand).
- `components/` — primitivas React (ver lista).
- `ui_kits/storefront/` — tienda mobile click-through.
- `ui_kits/admin/` — panel interno (mobile + desktop). Tipografía contenida (títulos Space Grotesk 24px, cuerpo Plex Sans 15px, montos Plex Mono), controles de 48px, radio 6px, íconos Lucide (como `lucide-react` en el repo).
- `assets/` — `logo-black.jpg`, `logo-transparent.png`, `photos/*.jpg` (7 fotos reales), `hero/render-central.png` (render de marca con texto quemado, del repo).
- `SKILL.md`, `github.md`, `thumbnail.html`.

## Components
- **brand/** — `Logo`, `ArrowMark`
- **core/** — `Button`, `Chip`, `Select`
- **navigation/** — `SiteHeader`, `BackLink`, `PageHeader`, `SectionHeading`
- **catalog/** — `HeroCarousel`, `RangeHero`, `ModelStrip`, `CategoryTile`, `ProductTile`, `ProductGallery`, `PriceBlock`, `EmptyState`

Mapeo al repo: AppShell → SiteHeader; ArrowMark → ArrowMark; HeroCarousel → HeroCarousel; IphoneModelStrip → ModelStrip; ModelFilter → Select; ProductDetail → Chip + PriceBlock + Button; ProductGallery → ProductGallery; ProductTile → ProductTile; `CategoryTileCard` (page.tsx) → CategoryTile; link "Inicio" → BackLink; encabezados de categoria/modelo → PageHeader; avisos punteados → EmptyState.

**Intentional additions:** `Logo` (envuelve la imagen oficial para no redibujarla), `SectionHeading` (títulos repetidos en la home), `RangeHero` (el hero tipográfico de `modelo_mockup.png`, ahora uno de los slides del carrusel de la home con "iPhone 11 → 18 Pro Max").

---

## CONTENT FUNDAMENTALS
- **Idioma:** español rioplatense, con **voseo**: "Elegí tu iPhone", "Probá de nuevo", "si tenés dudas", "Tu iPhone, pero más vos."
- **Persona:** la marca habla en *nosotros* ("Vendemos en ferias…", "escribirnos directo") y al cliente de *vos*. Cercano, directo, sin exagerar.
- **Casing:** oración normal en títulos y botones ("Consultar por WhatsApp", "Recién llegados."). Las **mayúsculas con tracking** se reservan a micro-etiquetas de navegación de 1–4 palabras: "ELEGÍ TU IPHONE →", "VER MÁS", "COLECCIÓN DESTACADA", nombres de categoría sobre foto.
- **Puntuación:** los titulares editoriales cierran con punto ("Recién llegados.", "Clásicos que siempre vuelven.") — eco del punto del logo.
- **Datos, no claims:** "12 productos para iPhone 15", "Quedan 2", "Última unidad", "Desde $ 15.000". Nada de "¡el mejor precio!", ni testimonios o métricas inventadas.
- **Errores y vacíos:** explican y ofrecen salida. "No encontramos esa página" / "Puede que el link esté viejo…" / "Volver al inicio". "No hay productos disponibles para iPhone 12 en esta categoría."
- **Emoji:** no se usan. Unicode sólo `→`, `·`, `/` y `‹ ›` en controles.
- **Números:** precios `es-AR` ARS sin decimales ("$ 18.500"); índices con cero ("01"); nombres de modelo completos ("iPhone 15 Pro Max").

## VISUAL FOUNDATIONS
- **Color:** monocromo cálido-neutro de cuatro valores — papel `#FAFAF8`, tinta `#121212`, grafito `#6B6B68`, regla `#E5E3DD` — más negro puro `#000` sólo en el header (el JPG del logo trae fondo negro quemado). **No hay color de acento**: el color lo ponen las fotos de las fundas. Estados (stock, activo) con peso, punto de tinta o inversión, nunca con color.
- **Tipografía:** Space Grotesk 600 para todo título y número de modelo, tracking negativo (−0.025 a −0.035em) e interlínea < 1 en display. IBM Plex Sans 300/400 para apoyo (300 en leads, 400 cuerpo, 500 labels de campo). IBM Plex Mono para precio, SKU y contadores, siempre `tabular-nums`.
- **Escala editorial:** hero `clamp(3rem,14.5vw,8rem)`, página `clamp(2.5rem,10vw,4.5rem)`, sección 30→36px. Títulos grandes, texto de apoyo chico y gris: el contraste de escala hace la jerarquía.
- **Espaciado y layout:** mucho aire — 64px entre secciones en mobile, 96px desde md; 40/56px en páginas interiores; 32px bajo el header, 80px al cierre. Margen lateral 20 → 24 → 40 → 64px. El ancho es el viewport completo (sin max-width) y hero, franja de modelos y mosaicos van **a sangre**.
- **Grillas:** 2 columnas en mobile (gap 12px), 3–5 en desktop (gap 16px).
- **Fotografía:** fotos reales de las fundas, a pleno sol sobre mesa de madera y pasto: cálidas, saturadas, con sombras duras. Van **grandes y en rectángulos simples** (radio 0), `object-fit: cover`, proporción 4/5 por defecto. Sin recortes ovalados, sin formas, sin marcos. Foto faltante: bloque regla al 40% con "Sin foto".
- **Fondos:** papel plano. Superficies oscuras (hero, bandas) en tinta. Sin gradientes decorativos, texturas ni ilustraciones.
- **Protección sobre foto:** velo lineal de tinta (80% → 10% → 0) de abajo hacia arriba en mosaicos, foto al 80% de opacidad sobre grafito; en el hero, velo arriba para el titular. Nunca cápsulas/pills detrás del texto.
- **Radios:** fotos 0; miniaturas 12px (en el repo); controles 16px (botón, select); avisos vacíos 28px (el cuerpo de un iPhone); chips y botones circulares en píldora.
- **Bordes:** 1px regla para divisores y franjas; 1px grafito en controles en reposo → tinta en hover; discontinuo regla en vacíos.
- **Sombras:** ninguna. Profundidad sólo por borde, escala o inversión papel/tinta.
- **Transparencia / blur:** papel al 85% para links del nav, 15%/10% para reglas sobre tinta, 90% para flechas sobre foto. Sin blur.
- **Hover:** texto grafito → tinta; bordes grafito → tinta; chips de sub-modelo invierten a tinta; fotos escalan 1.04–1.05 en 300ms; números de modelo bajan a 60% de opacidad; la flecha avanza 2px.
- **Press:** `scale(0.98)` en 200ms en botones y mosaicos.
- **Foco:** contorno 2px tinta, offset 3px (papel sobre el header).
- **Animación:** sobria. Transiciones de 200ms; crossfade 700ms en el hero; la única animación de entrada es la del `RangeHero` (sube 105% → 0 en 700ms `cubic-bezier(0.22,1,0.36,1)`, flecha dibujada). Sin fade-ins al scrollear. `prefers-reduced-motion` respetado.
- **Elementos fijos:** sólo el header sticky (80px, 64px en admin).
- **Tarjetas:** no hay "cards" con caja: un producto es foto + nombre + precio debajo, sin borde ni sombra. Las variantes se listan como filas separadas por reglas, sin paneles anidados.

## ICONOGRAPHY
- **No hay set de íconos ni icon font.** El repo dibuja a mano, como SVG inline de trazo, sólo lo imprescindible:
  - `ArrowMark` — flecha de trazo cuadrado con junta en inglete (viewBox 64×40, stroke 5–6) para "VER MÁS", "Inicio" (girada) y el hero. Es el ícono de marca.
  - Chevron del select (16×16, stroke 1.75, terminal cuadrada).
  - Hamburguesa / cerrar del menú mobile (24×24, stroke 2, terminal redonda).
- Flechas de carrusel/galería con los glifos Unicode `‹ ›` dentro de círculos; `→` como texto en "ELEGÍ TU IPHONE →".
- **Sin emoji.** El `home_mockup.png` muestra una bolsa de compras en el header, pero el código no tiene carrito (se compra por WhatsApp), así que no se incluyó.
- Si hace falta un ícono nuevo, usar trazo lineal fino con terminales cuadradas; Lucide es la opción CDN más cercana — **no está en el repo; sería una sustitución a validar**.

## Tipografías — nota
No se entregaron binarios de fuentes. Space Grotesk, IBM Plex Sans y IBM Plex Mono se cargan desde **Google Fonts** (`tokens/fonts.css`). El repo hoy usa Archivo (`layout.tsx`); `DESIGN.md` y la marca piden Space Grotesk + Plex, que es lo que sigue este sistema.
