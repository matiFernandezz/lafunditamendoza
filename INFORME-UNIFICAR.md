# Informe: backend unificado dentro de Next.js

Rama `unificar-vercel` (sin push). `main`, Vercel, Railway y la base de producción no se tocaron. `/backend` sigue en el repo, sin uso.

## Resultado

El frontend ya no depende de Express: los Route Handlers de `frontend/src/app/api/*` hablan directo con Supabase. Con Supabase local y **sin Express corriendo**, pasan las 178 pruebas, `npm run build` y `npm run lint`.

## Qué se migró

Los 24 endpoints de Express, con las mismas rutas, payloads, status y mensajes:

| Área | Endpoints |
|---|---|
| Categorías / modelos | `GET /api/categories`, `GET /api/iphone-models` |
| Productos | `GET` y `POST /api/products`, `PATCH /api/products/:id`, `PATCH /api/products/:id/price` (bulk) |
| Variantes | `POST /api/product-variants`, `PATCH /api/product-variants/:id` (stock / precio) |
| Proveedores | `GET` y `POST /api/suppliers` |
| Compras | `POST /api/purchases` → función SQL `create_purchase` |
| Ventas | `POST /api/sales` → función SQL `create_sale`; `GET /api/sales`, `GET /api/sales/summary`, `POST /api/sales/:id/void` |
| Fotos | `POST .../images/upload-url` (nuevo), `POST .../images`, `DELETE .../images/:imageId`, `PATCH .../images/reorder` |
| Reservas web | `POST /api/tienda/reservas` (pública), `GET /api/web-orders`, `GET /api/web-orders/counts`, `POST .../paid`, `POST .../cancel` |
| Página de reserva | `/reserva/[token]` lee de Supabase directo (antes llamaba a Express) |

Piezas nuevas:

- `frontend/src/lib/supabase/admin.ts`: cliente con `SUPABASE_SECRET_KEY`, con `import "server-only"`.
- `frontend/src/lib/server/auth.ts`: `requireAdmin()`, usado en los 23 handlers del panel.
- `frontend/src/lib/server/http.ts`: `jsonError` / `jsonData` (mismo formato `{ error }` / `{ data }` que Express).
- `frontend/src/lib/server/validate.ts`, `selects.ts`, `webOrders.ts`: validaciones y columnas compartidas.
- `supabase/migrations/20261003120000_transactional_sales_purchases.sql`.
- Eliminado: `frontend/src/lib/adminProxy.ts`.

El catálogo público (`lib/catalog.ts` y sus páginas) no se modificó: ya leía de Supabase con la anon key.

## Commits

| Commit | Qué |
|---|---|
| `d889643` | Plan (`PLAN-UNIFICAR.md`) |
| `847ab0a` | Infra de servidor: cliente admin, `requireAdmin`, errores JSON |
| `3acb4a0` | Migración: `create_sale`, `create_purchase`, `reorder_product_images`, límites del bucket |
| `55de5df` | Subida de fotos con URL firmada |
| `9307404` | Route Handlers con lógica directa; se elimina el proxy |
| `660c88a` | Script de pruebas (`npm run test:unificar`) |
| `6bdb217` | Limpieza de `BACKEND_*`, `.env.example`, README |

(El commit de este informe va después.)

## Pruebas

Script: `frontend/scripts/test-unificar.mjs` (`npm run test:unificar` desde `/frontend`). Solo corre contra Supabase local, crea sus datos y los borra. Corrido dos veces, contra `npm run dev` y contra el build de producción (`npm run start`): **178/178 OK** en ambas, con el puerto 3001 (Express) cerrado.

| # | Prueba pedida | Resultado | Qué se comprobó |
|---|---|---|---|
| 1 | Admin sin sesión → 401 | OK (25) | Los 23 endpoints del panel, más una cookie inventada (401) y una sesión real (200) |
| 2 | Venta con 15% de descuento | OK (26) | Subtotal 5500, descuento 825, total 4675, stock descontado; redondeo a pesos; 100% de descuento; precio manipulado → 409; 11 payloads inválidos → 400 |
| 3 | Stock insuficiente | OK (8) | 400 con "No alcanza el stock de SKU: quedan 4 y se quieren vender 99"; ninguna venta ni item guardado; stock intacto, incluso cuando el primer item sí alcanzaba |
| 4 | Anular venta | OK (11) | Stock restaurado, estado `anulada`, motivo y fecha; segunda anulación → 409 sin devolver stock otra vez |
| 5 | Compra | OK (13) | Stock sube, total calculado en el servidor, último costo actualizado; compra con variante inexistente no deja nada a medias |
| 6 | Stock y precio | OK (18) | Individual y bulk; negativos, decimales, texto y cero → 400 |
| 7 | Foto por URL firmada | OK (26) | Subida directa a Storage, aparece en el detalle público; borrado quita fila y archivo; GIF y más de 10MB rechazados; sin token no se puede subir; el bucket rechaza tipos no permitidos |
| 8 | Catálogo público | OK (15) | Home, categoría, modelo y detalle 200; solo variantes activas con stock > 0; la anon key sigue sin ver `cost_price` ni ventas |
| 9 | Build y lint | OK | `npm run build` sin errores; `npm run lint` 0 errores (1 warning que ya existía en `adminApi.ts`) |

Extras: las 3 funciones SQL nuevas devuelven "permiso denegado" con los roles `anon` y `authenticated` (6 pruebas); historial y resumen (8); reservas web completas (16). La secret key no aparece en el bundle del navegador (`.next/static`).

Lo que **no** se probó:

- Las pantallas del panel en un navegador real. Las pruebas hacen las mismas llamadas HTTP que el panel, pero conviene subir una foto y hacer una venta a mano antes de mergear.
- Los tests de Playwright (`tests/home.spec.ts`): no se corrieron. Su config se actualizó para que no levante el backend.
- "Igual que antes" en el catálogo se verificó por reglas y status, no comparando el HTML contra `main` (ese código no cambió).

## Decisiones

1. **Quién es admin**: igual que hoy, alcanza con una sesión válida de Supabase Auth. Esto depende de que el registro público esté deshabilitado. En local lo está (`enable_signup = false`); **en producción hay que confirmarlo** en Authentication > Sign In / Providers.
2. **Precio cambiado**: `create_sale` recibe el `unit_price` que vio el panel y, si no coincide con el de la base, falla con el mismo 409 de antes. Los montos siempre salen de la base.
3. **Stock**: `create_sale` bloquea las variantes y chequea el stock antes de insertar, para dar un mensaje claro. El trigger existente sigue descontando y sigue siendo el control final.
4. **Límites en el bucket**: una URL firmada no limita tamaño, así que la migración fija 10MB y JPEG/PNG/WEBP en el bucket `product-images`. Se valida en tres lugares: navegador, endpoint que firma y Storage.
5. **Reorden de fotos**: pasó a una función SQL (un solo UPDATE); antes eran N updates sueltos.
6. **Reservas web**: no estaban en la lista mínima, pero pasaban por Express; se migraron para poder apagar Railway.
7. **`server-only`**: se agregó como dependencia del frontend.

Cambios de comportamiento visibles solo en casos de error:

- Stock insuficiente: mismo status 400, mensaje nuevo y más claro (antes era el texto crudo del trigger, con el uuid de la variante).
- Compra con variante inexistente: 400 con "Alguna de las variantes de la compra no existe".
- Validaciones nuevas: `notes` tiene que ser texto (hasta 1000), `purchase_date` tiene que ser una fecha real.
- `POST /api/products/:id/images` ahora recibe JSON `{ path }` en vez de multipart. Solo lo usa el panel, que ya está adaptado.

## Sin migrar

- `GET /` de Express (el ping "API funcionando"): no lo usa nadie.
- `backend/scripts/importCatalog.ts` e `importProductImages.ts`: scripts de carga que siguen en `/backend` con su propio `.env`. Si algún día se borra `/backend`, hay que moverlos.

## Para producción

Orden sugerido: migración → variables en Vercel → deploy → probar → apagar Railway. La migración solo agrega cosas, así que Express sigue funcionando mientras tanto.

**Migraciones a aplicar (en orden):**

1. `20261003120000_transactional_sales_purchases.sql`

Es la única nueva. Antes conviene correr `supabase migration list` contra prod para confirmar que las 15 anteriores están aplicadas.

**Variables de entorno en Vercel:**

| Variable | Acción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya está; queda igual |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya está; queda igual |
| `SUPABASE_SECRET_KEY` | **Agregar** (secret / service_role key del proyecto). Sin prefijo `NEXT_PUBLIC_` |
| `BACKEND_URL` | Borrar después del deploy |
| `BACKEND_API_KEY` | Borrar después del deploy |

## Estado de tu máquina

- Docker Desktop estaba apagado: lo abrí y levanté Supabase local (`supabase start`, sin `db reset`: tus datos locales están intactos). Quedaron corriendo.
- La migración nueva está aplicada en la base **local**.
- `frontend/.env.local`: agregué `SUPABASE_SECRET_KEY` con la clave local. `BACKEND_URL` y `BACKEND_API_KEY` siguen ahí, ya sin uso; se pueden borrar.
- Borré `frontend/.next`: la caché de Turbopack estaba corrupta (error de `next/font/google`, 500 en todo). No tenía relación con el refactor.
- El contador de códigos de reserva local avanzó (las pruebas crearon y borraron reservas).
- Al diagnosticar el arranque de Supabase, en la salida de mi terminal quedaron impresas las claves del stack **local**. Son las claves de desarrollo del CLI de Supabase y solo sirven contra `127.0.0.1`; ninguna clave de producción se leyó ni se imprimió.
