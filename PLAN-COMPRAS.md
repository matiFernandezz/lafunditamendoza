# Plan: compras con grilla

Rama `compras-grilla`. Todo en local; nada a producción.

## Cómo está hoy

- `/admin/compras` busca **variantes** de a una y arma una lista de líneas (cantidad + costo por línea). Cargar una factura con 8 modelos son 8 búsquedas.
- `POST /api/purchases` valida y llama a `create_purchase(supplier, date, notes, items)`: compra + items en una transacción. El trigger de `purchase_items` suma el stock y pisa `cost_price` de la variante con el último costo.
- "Nuevo producto" (`/admin/productos`) crea el producto, después cada variante y después las fotos, con llamadas HTTP separadas (no es transaccional; si falla a mitad, reintenta lo que falta). El SKU se sugiere con `suggestSku(nombre, modelo, color)` y se le agrega `-2`, `-3`… si ya existe.
- `purchases` no tiene `created_at`: dos compras del mismo día no se pueden ordenar.

## Qué se hace

### Base (una migración nueva)
- `purchases.created_at`, para saber cuál fue la última compra.
- `create_purchase_grid(supplier, date, notes, products jsonb)`: en una sola transacción crea productos nuevos, variantes nuevas, la compra, los items (el trigger mueve el stock) y, si se pidió, el precio de venta de las variantes compradas. Valida nombre duplicado, SKU duplicado, modelo+color repetido, cantidades enteras > 0, costos > 0 y precios > 0. Solo `service_role`.
- `last_purchase_costs()`: último costo de compra por variante, de la más nueva a la más vieja. Solo `service_role`.
- `create_purchase` queda igual (lo siguen usando las pruebas existentes).

### API
- `POST /api/purchases` acepta además `products` (formato grilla) y llama a `create_purchase_grid`.
- `GET /api/purchases/last-costs` para el "costo anterior".

### Pantallas
- `productos/productDraft.ts` + `productos/ProductDraftForm.tsx`: el formulario de "Nuevo producto" extraído como componente controlado. `/admin/productos` lo usa igual que antes; la compra lo usa con la columna de costo.
- `compras/purchaseLogic.ts`: lógica pura (sin React ni imports): cantidades, costo "para todos", totales, validación con un solo mensaje, armado del payload, costo anterior, ganancia y precio sugerido. Se prueba directo desde el script.
- `compras/PurchaseBlock.tsx`: bloque de un producto existente (grilla de variantes).
- `compras/page.tsx`: cabecera (proveedor + fecha dd/mm/aaaa), buscador de productos con "Crear producto nuevo", bloques y resumen.
- Catálogo: etiqueta "Sin foto".

### Pruebas
`frontend/scripts/test-compras.mjs` (`npm run test:compras`): los 7 casos del pedido, por HTTP contra la app local más la lógica pura. `test:unificar` tiene que seguir pasando.

## Decisiones tomadas de entrada
- Las fotos de un producto nuevo se suben **después** de registrar la compra: Storage no puede entrar en la transacción SQL. Si fallan, la compra queda y se avisa.
- Una variante nueva en un producto existente toma como precio de venta el campo "Actualizar precio de venta" si está cargado; si no, el precio actual del producto.
- En un producto nuevo dentro de una compra, las filas sin cantidad no se crean (misma regla que el resto de la grilla).
