# Plan: unificar el backend Express dentro de Next.js

Rama: `unificar-vercel`. Objetivo: que todo corra en Vercel y se pueda apagar Railway.
Lo que ve el usuario (tienda y panel) no cambia: mismas rutas, mismos payloads, mismas respuestas.

## 1. Cómo funciona hoy

```
navegador ──> Next (/app/api/*, valida sesión) ──x-api-key──> Express en Railway ──service_role──> Supabase
navegador ──> Next (páginas del catálogo) ──anon key + RLS──> Supabase            (no pasa por Express)
```

Después del cambio, los Route Handlers hablan con Supabase directo (secret key, solo servidor) y Express queda sin uso.

## 2. Endpoints de Express (`backend/src/routes/*`)

Todos están detrás de `apiKeyAuth` (header `x-api-key`). Errores siempre como `{ "error": "mensaje" }`; éxitos como `{ "data": ... }`.

| # | Método | Ruta | Qué hace | Tablas / funciones |
|---|--------|------|----------|--------------------|
| 1 | GET | `/api/categories` | Lista categorías por nombre | `categories` |
| 2 | GET | `/api/iphone-models` | Lista modelos por `sort_order`, nombre | `iphone_models` |
| 3 | GET | `/api/products` | Lista productos con variantes y fotos (filtro opcional `category_id`) | `products`, `product_variants`, `product_images` |
| 4 | POST | `/api/products` | Crea producto | `products` |
| 5 | PATCH | `/api/products/:id` | Edita nombre y/o descripción | `products` |
| 6 | PATCH | `/api/products/:id/price` | Mismo precio a todas las variantes (bulk) | `products`, `product_variants` |
| 7 | POST | `/api/products/:id/images` | Sube foto (multipart, multer) y registra la fila | Storage `product-images`, `product_images` |
| 8 | DELETE | `/api/products/:id/images/:imageId` | Borra la fila y el archivo | `product_images`, Storage |
| 9 | PATCH | `/api/products/:id/images/reorder` | Reordena fotos (un UPDATE por foto) | `product_images` |
| 10 | POST | `/api/product-variants` | Crea variante | `product_variants` |
| 11 | PATCH | `/api/product-variants/:id` | Edita stock y/o precio | `product_variants` |
| 12 | GET | `/api/suppliers` | Lista proveedores | `suppliers` |
| 13 | POST | `/api/suppliers` | Crea proveedor | `suppliers` |
| 14 | POST | `/api/purchases` | Crea compra + items (2 inserts y compensación manual) | `purchases`, `purchase_items`, trigger de stock |
| 15 | POST | `/api/sales` | Crea venta + items (2 inserts y compensación manual) | `product_variants`, `sales`, `sale_items`, trigger de stock |
| 16 | GET | `/api/sales` | Historial paginado por rango | `sales`, `sale_items`, `web_orders`, `product_variants`, `products`, `iphone_models` |
| 17 | GET | `/api/sales/summary` | Resumen del período | rpc `sales_summary` |
| 18 | POST | `/api/sales/:id/void` | Anula venta | rpc `void_sale` |
| 19 | POST | `/api/web-orders` | Crea reserva desde la tienda | rpc `create_web_order`, `web_orders` |
| 20 | GET | `/api/web-orders/public/:token` | Reserva vista por el cliente | `web_orders`, `web_order_items` |
| 21 | GET | `/api/web-orders/counts` | Cantidad de reservas por estado | `web_orders` |
| 22 | GET | `/api/web-orders` | Lista reservas por estado | `web_orders`, `web_order_items` |
| 23 | POST | `/api/web-orders/:id/paid` | Marca pagada (genera la venta) | rpc `mark_web_order_paid` |
| 24 | POST | `/api/web-orders/:id/cancel` | Cancela y devuelve stock | rpc `cancel_web_order` |
| 25 | GET | `/` | Ping "API funcionando" | — (no se migra) |

## 3. Route Handlers de Next que hoy son proxy (`frontend/src/app/api/*`)

Todos usan `adminProxy.ts` (`requireSession` + `forwardToBackend`).

| Route Handler | Métodos | Sesión | Reenvía a |
|---|---|---|---|
| `categories/route.ts` | GET | admin | #1 |
| `iphone-models/route.ts` | GET | admin | #2 |
| `products/route.ts` | GET, POST | admin | #3, #4 |
| `products/[id]/route.ts` | PATCH | admin | #5 |
| `products/[id]/price/route.ts` | PATCH | admin | #6 |
| `products/[id]/images/route.ts` | POST (multipart) | admin | #7 |
| `products/[id]/images/[imageId]/route.ts` | DELETE | admin | #8 |
| `products/[id]/images/reorder/route.ts` | PATCH | admin | #9 |
| `product-variants/route.ts` | POST | admin | #10 |
| `product-variants/[id]/route.ts` | PATCH | admin | #11 |
| `suppliers/route.ts` | GET, POST | admin | #12, #13 |
| `purchases/route.ts` | POST | admin | #14 |
| `sales/route.ts` | GET, POST | admin | #16, #15 |
| `sales/summary/route.ts` | GET | admin | #17 |
| `sales/[id]/void/route.ts` | POST | admin | #18 |
| `web-orders/route.ts` | GET | admin | #22 |
| `web-orders/counts/route.ts` | GET | admin | #21 |
| `web-orders/[id]/paid/route.ts` | POST | admin | #23 |
| `web-orders/[id]/cancel/route.ts` | POST | admin | #24 |
| `tienda/reservas/route.ts` | POST | **pública** | #19 |

Además, `lib/reservations.ts` (Server Component de `/reserva/[token]`) llama a #20 con la API key.

El catálogo público (`lib/catalog.ts`) **no usa Express**: lee de Supabase con la anon key y RLS. No se toca.

## 4. Plan de migración

**Parte 1 – Infra** (`frontend/src/lib/`)
- `supabase/admin.ts`: cliente con `SUPABASE_SECRET_KEY`, `import 'server-only'`.
- `server/auth.ts`: `requireAdmin()` → 401 con el mismo mensaje de hoy.
- `server/http.ts`: `jsonError(status, mensaje)`, `jsonData(...)`, lectura segura del body.
- `server/validate.ts`: `isUuid`, `isPositiveInt`, `isPositiveNumber` (copiados de Express).
- Se elimina `adminProxy.ts`.

**Parte 2 – Endpoints**: cada Route Handler de la tabla 3 deja de reenviar y ejecuta la lógica del endpoint de Express correspondiente (mismos mensajes y status). `reservations.ts` pasa a leer de Supabase directo.

**Parte 3 – SQL** (una migración nueva):
- `create_sale(p_payment_method, p_channel, p_notes, p_discount_percent, p_items)`.
- `create_purchase(p_supplier_id, p_purchase_date, p_notes, p_items)`.
- `reorder_product_images(p_product_id, p_order)`: hoy son N updates sueltos; lo paso a una función por el mismo criterio ("nada de varios writes sueltos desde Node").
- Todas con `REVOKE` a `public, anon, authenticated` y `GRANT` a `service_role`.

**Parte 4 – Imágenes**
- `POST /api/products/:id/images/upload-url` → valida tipo/tamaño y devuelve URL firmada.
- El navegador sube directo a Storage.
- `POST /api/products/:id/images` (misma ruta, ahora JSON `{ path }`) → verifica el archivo y registra la fila.
- `DELETE` sigue limpiando Storage.

**Parte 5 – Limpieza**: sacar `BACKEND_URL` / `BACKEND_API_KEY`, actualizar `.env.example` y README.

**Pruebas**: `frontend/scripts/test-unificar.mjs` contra Supabase local y `next` levantado, sin Express.

## 5. Cosas a tener en cuenta (decisiones tomadas)

1. **Quién es "admin"**: hoy alcanza con tener sesión válida de Supabase Auth (no hay tabla de roles). `requireAdmin()` mantiene ese criterio. Es seguro solo si el registro público de usuarios está deshabilitado en Supabase; lo dejo anotado en el informe para verificar en prod.
2. **Precio que cambió durante una venta**: Express devuelve 409 "El precio de X cambió…". `create_sale` conserva ese control (recibe el `unit_price` que vio el panel y lo compara con el de la base).
3. **Límite del bucket**: la URL firmada no limita tamaño por sí sola. La migración fija en el bucket `file_size_limit` = 10 MB y `allowed_mime_types` = JPEG/PNG/WEBP, así Storage lo rechaza aunque alguien saltee el cliente.
4. **Variable de la clave**: `SUPABASE_SECRET_KEY` (nombre pedido). En local es la `service_role key` de `supabase status`.
5. **Reservas web (`web-orders`)**: no estaban en la lista mínima pero también pasan por Express; se migran igual, si no Railway no se podría apagar.
6. **Validaciones nuevas** (más estrictas que Express, no cambian el uso normal): `notes` debe ser texto, `purchase_date` debe ser una fecha real.
