# Informe — navegación y filtros de categorías

Rama: `filtros-categorias` (creada desde `main` local). **Nada pusheado, `main` sin tocar, producción sin tocar.** Todo se probó contra la base local.

## Qué cambió

**Menú.** Header (desktop y mobile) y footer quedan en **Fundas · Accesorios · Nosotros**, sin desplegables. "Cargadores y cables" dejó de ser una entrada del menú: ahora es un tipo de Accesorios.

**Página de Fundas** (`/categoria/fundas`). De arriba hacia abajo:

1. Título y cantidad de productos.
2. Selector "Elegí tu iPhone" (el filtro principal, más grande).
3. Chips de tipo con cantidad: Todas / Silicona / Transparentes / Diseño.
4. Selector de orden: Más nuevos / Menor precio / Mayor precio.
5. Grilla.

**Estado en la URL**, para compartir: `/categoria/fundas?modelo=<slug>&tipo=<slug>&orden=<valor>`.

- `modelo` acepta el slug (`iphone-15`) y también el uuid de los links viejos.
- Los valores por defecto no se escriben en la URL.

**Chips.**

- Las cantidades respetan el modelo elegido.
- Un chip con 0 productos para ese modelo se oculta.
- Si alguien llega por una URL compartida a una combinación sin productos (por ejemplo Silicona para iPhone 12), la página lo explica y ofrece dos salidas: "Ver todo para iPhone 12" o "ver silicona de todos los modelos".

**Página de Accesorios** (`/categoria/accesorios`). Mismo patrón, con chips por tipo.

- El selector de modelo aparece solo cuando el tipo elegido es por modelo (Lentes de cámara, Vidrios templados). En "Todos" y en tipos universales (Straps, Soportes…) no aparece, y un `?modelo` en la URL se ignora.
- Los chips se muestran solo si hay 2 o más tipos con productos.

**Sigue valiendo:** una tarjeta por producto, "Desde $X" si el precio varía y precio exacto con modelo elegido, solo productos con stock.

**Redirecciones** (permanentes, 308, conservando `modelo` y `orden`):

| URL vieja | Va a |
|---|---|
| `/categoria/de-diseno` | `/categoria/fundas?tipo=diseno` |
| `/categoria/de-silicona` | `/categoria/fundas?tipo=silicona` |
| `/categoria/transparentes` | `/categoria/fundas?tipo=transparentes` |
| `/categoria/cargadores-y-cables` | `/categoria/accesorios?tipo=cargadores-y-cables` |

Los dos slugs renombrados salen de un mapa (`LEGACY_CATEGORY_SLUGS` en `frontend/src/lib/catalogFilters.ts`). Además, cualquier tipo abierto como página suelta (`/categoria/straps`) redirige al filtro de su categoría.

**Producto.** Las migas quedan "Inicio / Fundas / Diseño / Producto"; el tipo lleva al listado ya filtrado.

**Home.** Los mosaicos "Elegí por categoría" pasan de 5 a 4: Silicona, Transparentes, Diseño y Accesorios.

**Admin.**

- Los selectores de categoría (Catálogo, Nuevo producto, alta de variante) muestran la ruta completa: "Fundas › Diseño", "Accesorios › Straps".
- Los chips de Ventas también muestran la ruta completa, y ya no hay chips vacíos de "Fundas" o "Accesorios" a secas.

## Asignación de tipos de Accesorios (para revisar)

| Tipo (slug) | Productos |
|---|---|
| Lentes de cámara (`lentes-de-camara`) | Lentes de cámara con Glitter · Lentes de cámara metalizados |
| Vidrios templados (`vidrios-templados`) | Vidrio templado 9D/SD · Vidrio templado Anti Espía |
| Straps (`straps`) | Straps/Correas perlas |
| Soportes (`soportes`) | Soporte Ventosa Doble |
| Auriculares (`auriculares`) | AirPods Pro 2da Generación |
| Cargadores y cables (`cargadores-y-cables`) | Cabezal 20W Apple Certificado · Cables Certificados Apple |
| Protectores de cargador (`protectores-de-cargador`) | Funda Cargador + Comecable · Funda cargador + comecables · Funda Cargador STRASS · COMBO Funda + Funda Cargador |

Dos puntos a mirar:

- **Las cuatro "funda cargador" salieron de "Cargadores y cables"** y pasaron a "Protectores de cargador". En "Cargadores y cables" quedan solo el cabezal y los cables.
- **"COMBO Funda + Funda Cargador"** lo puse en Protectores de cargador porque no tiene variantes por modelo. Si preferís que esté en otro lado, es una línea de la migración.

La migración asigna por **nombre exacto** del producto. Un accesorio de producción cuyo nombre no esté en la tabla queda en "Accesorios" a secas: la tienda lo muestra en "Todos" (sin chip propio) y en Ventas aparece un chip "Accesorios". No se pierde nada, pero conviene asignarle un tipo.

## Commits

| Commit | Qué |
|---|---|
| `e8c3c99` | Migración de categorías, `supabase/seed.sql` y `backend/scripts/importCatalog.ts` con los nombres nuevos |
| `2e9bd99` | Páginas de Fundas y Accesorios con filtros en la URL y redirecciones |
| `8192fe5` | Menú plano, home y migas del producto |
| `16008b7` | Admin: ruta completa de la categoría |
| `1f169f8` | `test:unificar` adaptado a las URLs nuevas |

La rama también arrastra 4 commits que ya estaban en `main` local sin subir: footer (`98b0996`), Nosotros (`3ad987f`), desplegable de Fundas (`1ed4cf0`, que esta rama reemplaza por el menú plano) y descripción del producto (`60d5088`).

## Pruebas

- `npm run lint`: 0 errores (queda el warning de siempre en `adminApi.ts`).
- `npm run build`: OK.
- `npm run test:unificar`: **180/180**. Tuve que adaptarlo: abría `/categoria/<tipo>` esperando 200 y ahora eso es un 308.
- **Migración**: corrida dos veces seguidas en local, sin errores y con el mismo resultado.
- **Import** (`importCatalog.ts`): corrido dos veces con los nombres nuevos: 0 productos creados, 41 reusados, 12 categorías, y la asignación producto→categoría no cambió. El import pone el stock en 0 al re-correr (ya lo hacía antes), así que resguardé y restauré precios y stock locales.
- **HTTP contra el build de producción local** (25 chequeos, todos OK):
  - Las 4 URLs viejas dan 308 al destino de la tabla y terminan en 200. Con `?modelo=<uuid>` lo conservan.
  - `/categoria/fundas`: 28 productos; chips Todas 28 / Silicona 1 / Transparentes 4 / Diseño 23; el selector de iPhone va antes de los chips y el orden después.
  - Para cada modelo del selector, cada chip lleva a una página con exactamente la cantidad que dice (29 combinaciones, ninguna en 0), y con modelo elegido no hay precios "Desde".
  - `?modelo=iphone-15` y `?modelo=<uuid>` dan lo mismo.
  - Silicona + iPhone 12 (sin productos): 200 con la explicación y los dos links de salida; en `/categoria/fundas?modelo=iphone-12` el chip Silicona no aparece.
  - Orden por menor y por mayor precio, verificado sobre los precios de las tarjetas.
  - Accesorios: 13 productos, 7 chips con sus cantidades, sin selector en "Todos"; con selector en Lentes de cámara; en Straps el modelo de la URL se ignora.
  - Header y footer con los tres links; home sin slugs viejos; migas del producto.
- **Navegador (Playwright, sin capturas)**:
  - 7 páginas a 390px y a 1440px sin scroll horizontal.
  - Elegir modelo, tocar un chip y elegir orden cambian la URL y conservan los otros filtros.
  - Menú mobile con las tres entradas.
- **Test e2e de la home** (`tests/home.spec.ts`): 2 de 4 fallan, y **ya fallaban antes de esta rama**. Esperan que el `h1` diga "Tu iPhone, pero más vos." y el `h1` real es el del hero ("iPhone 11 a 18 Pro Max"), que no toqué. No lo corregí porque está fuera de este pedido.

## Decisiones que tomé solo

- **Orden por defecto: "Más nuevos".** Antes los listados iban por nombre.
- **Home con 4 mosaicos** (los 3 tipos de funda + Accesorios), en vez de un mosaico por cada tipo de accesorio (habrían sido 10).
- **Selector de modelo acotado.** Solo ofrece modelos que tienen algo en la vista actual, para que no se pueda elegir uno que deje la página vacía.
- **Columna nueva `categories.sort_order`**, para que los chips salgan en el orden pedido (Silicona, Transparentes, Diseño) y no alfabético.
- **"Vidrios templados" vuelve a ser un tipo.** El seed anterior la había eliminado como categoría; ahora es hija de Accesorios, con id nuevo.
- **El título de la página incluye el tipo elegido** ("Fundas / Diseño"), y el link de vuelta lleva a "Fundas".
- **`/modelo/<slug>`** (la franja "Elegí tu iPhone" de la home) quedó como estaba.

## Migraciones a aplicar en producción (en orden)

1. `supabase/migrations/20261004120000_category_filters.sql`

Es la única nueva. Aplicala **antes** de desplegar el código: el código nuevo ordena por `categories.sort_order`, y sin esa columna la tienda entera falla, porque el menú se carga en todas las páginas.

Al revés hay una ventana corta: entre aplicar la migración y que termine el deploy, la web vieja sigue andando, pero sus links a `/categoria/de-diseno` y `/categoria/de-silicona` dan 404 hasta que el código nuevo esté arriba.

Pasos sugeridos:

1. `npx supabase migration list --linked`: tiene que mostrar pendiente solo esa.
2. `npx supabase db push --linked`.
3. Merge a `main` y push.
4. Revisar en producción que todos los accesorios hayan quedado con tipo (ver "Asignación").

`supabase/seed.sql` no hace falta correrlo en producción: la migración ya deja las categorías como las describe el seed.
