# Plan: selector de color con círculos

Rama `colores` (sale de `main` en `8f71ac2`, con `compras-grilla` ya mergeada). Todo en local.

## Cómo está hoy (base local)

- El color es texto libre en `product_variants.color`. 42 productos, 43 fotos.
- 285 variantes sin color (vacío); no hay ninguna con "Único" en la base, aunque el código lo trata igual que vacío (`displayColor`).
- 41 textos distintos. Hay duplicados por género ("negro" / "negra", "blanco" / "blanca") y cinco que no son colores: BATMAN, BOB, CAP AMÉRICA, IRON MAN y "Tipo C a Lightning".
- 12 productos tienen más de un color.
- Hace un día el campo del panel pasó a llamarse "Descripción" justamente porque se usa para cosas que no son colores (cables).

## Qué se hace

### Datos (una migración idempotente)
- Tabla `colors` (name, slug, hex, `assigned`, sort_order). Lectura pública, escritura solo `service_role`.
- `product_variants.color_id` y `product_images.color_id` (null = foto general).
- Un trigger mantiene el texto `color` igual al nombre del color. Si alguien escribe solo el texto (compras, importación), el trigger busca el color por nombre y lo enlaza: ningún camino viejo se rompe.
- `sync_colors_from_variants()` crea los colores que falten desde los textos y enlaza las variantes. La usan la migración, `seed.sql` y el script de importación.
- Se unifican "negra" → Negro, "blanca" → Blanco, "morada" → Morado, "bordo" → Bordó.

### Color y descripción conviven
Una variante con `color_id` tiene color. Una sin `color_id` puede tener texto en `color`: es una descripción ("Tipo C a C"). En los formularios se elige un color de la lista o, aparte, "Otra descripción (no es un color)". En `/admin/colores` cada color tiene "No es un color", que lo saca de la lista y deja el texto como descripción.

### API
`GET/POST /api/colors`, `PATCH/DELETE /api/colors/[id]`. Las fotos aceptan `color_id` al registrarse.

### Admin
`/admin/colores`, selector "Fotos de: General · …" en Catálogo, `ColorField` (combobox con círculo y "Crear color nuevo") en agregar variante, Nuevo producto y Compras, y la etiqueta "Color sin foto".

### Tienda
Círculos de color en la ficha (solo con 2 o más colores), galería por color con caída a las fotos generales, disponibilidad por modelo, `?color=<slug>`, y puntitos de color en las tarjetas.

### Compras
El color sale de la lista. La matriz modelo × color queda para decidir después de ver cuánto complica la grilla actual.

### Pruebas
`npm run test:colores`: migración, permisos, trigger, API y la lógica pura (`lib/productColors.ts`). Sin Playwright ni capturas: la verificación visual queda para `npm run dev`.
