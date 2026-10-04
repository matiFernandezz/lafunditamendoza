# Informe: agregar y quitar colores por producto y por categoría

Rama `colores`, a continuación del selector de color. Todo en local: no se pusheó ni se aplicó nada a producción.

## Qué cambió

### Base
Cuatro funciones transaccionales, ejecutables solo por `service_role`:

- **`add_color_to_product`**: crea una variante de ese color por cada modelo que el producto tiene (una sola si es universal), con stock 0, activa, el precio de otra variante del mismo modelo y un SKU único. Si el color ya está, no duplica: reactiva las dadas de baja. Devuelve creadas, reactivadas y ya existentes.
- **`remove_color_from_product`**: da de baja (`active = false`) las variantes de ese color; nunca las borra. Si alguna tiene stock y no se fuerza, no hace nada y devuelve cuántas unidades y qué variantes.
- **`add_color_to_category`** y **`remove_color_from_category`**: lo mismo para todos los productos de la categoría y de sus subcategorías. La de quitar solo da de baja variantes con stock 0 y devuelve las omitidas.
- Las cuatro rechazan Accesorios y cualquier categoría que cuelgue de Accesorios.

Además `suggest_sku`, que arma el SKU en SQL con la misma lógica del panel, y `category_is_accessory`.

### API
- `POST /api/products/[id]/colors` y `DELETE /api/products/[id]/colors/[colorId]`
- `POST /api/categories/[id]/colors` y `DELETE /api/categories/[id]/colors/[colorId]`

Todas con `requireAdmin` y el formato de error de siempre. Aceptan `dry_run` para la vista previa.

### Panel (en Catálogo)
- **Colores de cada producto**: chips con el círculo, el nombre, la cantidad de modelos y una "x" para quitar. "+ Agregar color" abre el selector de colores.
- **Confirmación antes de aplicar**: "Se van a crear N variantes (una por modelo) con stock 0" al agregar; "Se van a dar de baja N variantes" al quitar y, si hay stock, "Hay X unidades en stock que dejarán de venderse" con el detalle por modelo.
- **Resultado**: "Se agregó Rojo a Silicone Case: 12 variantes nuevas", y la lista se refresca.
- **Filtro por categoría** (nuevo) junto al buscador. Al elegir una categoría que no es de Accesorios aparece "Colores de <categoría>", con Agregar / Quitar, vista previa de productos y variantes afectados y de los omitidos, y confirmación.
- **Selector de colores con buscador** por nombre (sin distinguir mayúsculas ni tildes). Los colores que el producto ya tiene salen marcados "ya lo tiene" y no se pueden elegir. Si se busca un nombre que no existe, "Crear color nuevo" arranca con ese texto.
- Las variantes dadas de baja se ven en la lista con la etiqueta "Dada de baja".

## Commits

| Commit | Qué |
|---|---|
| `7ddbb69` | Funciones SQL y plan. Incluye un ajuste a la migración de colores anterior (ver Decisiones) |
| `69fdf69` | Endpoints |
| `ab5fe87` | Panel: colores por producto y por categoría, buscador en el selector |
| `c301d46` | `npm run test:colores-gestion` |

## Pruebas

| Comando | Resultado |
|---|---|
| `npm run test:colores-gestion` (nuevo) | 98/98 OK |
| `npm run test:colores` | 115/115 OK |
| `npm run test:compras` | 162/162 OK |
| `npm run test:unificar` | 180/180 OK |
| `npm run build` | OK |
| `npm run lint` | 0 errores, 1 advertencia que ya estaba (`adminApi.ts:27`) |

Los casos pedidos:

1. **Agregar a un producto con 3 modelos**: 3 variantes, stock 0, activas, con el precio de su modelo (9000 / 9500 / 10000) y SKU únicos e iguales a los que arma el panel. Si el SKU sugerido ya existe, le suma `-2`.
2. **Color que ya existe**: 0 creadas y 3 ya existentes. Con 2 dadas de baja: reactiva 2, sin crear filas nuevas.
3. **Quitar**: sin stock, 3 dadas de baja y las filas siguen en la base. Con stock y sin forzar, no hace nada y devuelve las 4 unidades y la variante. Forzado, las da de baja sin tocar el stock.
4. **Por categoría**: agrega a los productos de la categoría y de su tipo (7 variantes en 4 productos), omite el que no maneja colores y el que no tiene variantes. Al quitar, da de baja 6 y reporta la que tiene stock.
5. **Accesorios y un tipo hijo**: las cuatro funciones lo rechazan, también en vista previa.
6. **Historial**: después de dar de baja una variante con una venta y una compra, los items siguen ahí, el historial la muestra con producto, modelo y color, y anular la venta funciona. La base no deja borrar esa variante.
7. **Sin sesión**: los cuatro endpoints devuelven 401, y las funciones SQL rechazan a `anon` y `authenticated`.

La migración se corrió dos veces seguidas en local sin errores.

### Lo que no está probado
La interfaz en el navegador, tampoco a 390px: no corro Playwright ni saco capturas. Están verificados el servidor, la base y la compilación; el aspecto y el flujo de clicks quedan para `npm run dev`.

## Decisiones

- **La interfaz está en `/admin/catalogo`, no en `/admin/productos`.** `/admin/productos` es el formulario de "Nuevo producto" y no tiene lista; la lista y el buscador por nombre ya estaban en Catálogo. Si la querés en otra pantalla, los componentes (`ProductColors`, `CategoryColors`) se mueven tal cual.
- **Solo los productos que ya manejan colores muestran "Colores".** Un producto sin ninguna variante con color (una funda de diseño) no muestra los controles, y la acción por categoría lo omite con el motivo "no maneja colores". Agregarle un color crearía una segunda variante por modelo al lado de la que no tiene color, que no es lo que se busca. La función SQL por producto sí lo permite, por si más adelante se quiere empezar a cargar colores en uno.
- **Accesorios se reconoce por el slug `accesorios`** de la categoría de tope. Si esa categoría se renombra conservando el slug, sigue funcionando; si se le cambia el slug, hay que actualizar la función y la constante del panel.
- **Los productos de Accesorios tampoco aceptan estas acciones por producto**, no solo por categoría.
- **Vista previa con `p_dry_run`.** Las funciones tienen un parámetro más que el pedido. La vista previa corre el mismo código que la acción real y lo deshace, así los números que se muestran antes de confirmar son los que después se aplican.
- **Los modelos de un producto son los de todas sus variantes**, activas o no, como decía el pedido. Primero lo había hecho solo con las activas y una prueba lo mostró: al reactivar un color en un producto con casi todo dado de baja, volvía un solo modelo.
- **Precio de la variante nueva**: el de otra variante del mismo modelo; si hay varias, primero las activas y de esas la más cara.
- **Quitar con stock desde el panel**: la confirmación muestra las unidades y el botón pasa a "Dar de baja igual". El stock de la variante no se toca: si se vuelve a agregar el color, reaparece.
- **Un color aparece como chip si tiene alguna variante activa.** El número al lado es la cantidad de modelos.
- **Ajuste a la migración de colores anterior** (`20261006120000_colors.sql`, todavía sin aplicar en producción): sus funciones ahora fijan `search_path = public, extensions`. En producción `unaccent` puede estar en el esquema `extensions`; con solo `public`, el trigger de colores podía fallar ahí. En local no cambia nada.

## Lo que quedó sin hacer

- La prueba en navegador (ver arriba).
- Quitar un color en bloque cuando hay stock: hay que hacerlo producto por producto, como pedía el brief.
- Deshacer una acción en bloque con un click. Se revierte con la acción contraria: quitar lo agregado, o volver a agregar lo quitado (reactiva las mismas variantes).
- Sigue pendiente de antes: la matriz modelo × color en Compras.

## Migraciones para producción

Dos, en este orden, ninguna aplicada:

1. `supabase/migrations/20261006120000_colors.sql`
2. `supabase/migrations/20261007120000_color_management.sql`

La segunda depende de la primera (usa `colors` y `color_id`). Las dos son idempotentes y tienen que aplicarse **antes** de desplegar el frontend de esta rama.
