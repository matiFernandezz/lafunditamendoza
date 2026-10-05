# Informe: colores, motivos y gestión de variantes

Rama `colores`. Todo en local: no se pusheó esta tanda ni se aplicó nada nuevo a producción.

Este informe describe cómo quedó todo después del último cambio de diseño, que **reemplazó la matriz** modelo × color por la gestión variante por variante. El modelo de datos, la tienda, las fotos por color o motivo, "Editar colores" (con "Unir colores" y "Pasar a motivo"), los motivos y los colores no cambiaron.

## Estado de las migraciones

Verificado con `supabase migration list --linked`:

| Migración | En producción |
|---|---|
| `20261006120000_colors.sql` | Sí |
| `20261007120000_color_management.sql` | Sí |
| `20261008120000_motifs_and_matrix.sql` | **No** |

Como la tercera no está aplicada, la edité: saqué las funciones de la matriz y sumé las nuevas. No hizo falta otra migración.

## Qué cambió en esta tanda

### 1. Se fue la matriz
- Eliminados: la matriz "Colores por modelo", la de motivos y la lista de motivos con "x" (cuatro componentes), el endpoint de celdas, y los endpoints viejos de agregar o quitar un color en todos los modelos de un producto.
- En la base se borran las dos funciones de la matriz (`apply_attribute_cells` y su interna).
- En cada producto, los chips de **Colores** (o **Motivos**) son ahora un resumen de solo lectura: círculo, nombre y cantidad de variantes. Tocar uno filtra la lista de variantes por ese color; tocarlo de nuevo, o "Ver todas", saca el filtro. No tienen "x" ni acciones masivas.
- "Colores de <categoría>" se mantiene.

### 2. Buscador en la lista de variantes
- Un campo arriba de la lista de cada producto. Ignora mayúsculas y tildes; con varias palabras tienen que cumplirse todas; busca en modelo, color / motivo / descripción y SKU.
- Contador "12 de 139" mientras hay algo escrito, y una "x" (o Escape) para limpiar.

### 3. Eliminar variantes
- Cada fila tiene **Eliminar**. Desaparecieron "Dada de baja", "Inactiva" y cualquier forma de ver variantes dadas de baja.
- La función `delete_variant` revisa todas las tablas que apuntan a `product_variants`, **detectadas por las claves foráneas** (hoy `sale_items`, `purchase_items` y `web_order_items`):
  - sin ninguna referencia: **borra** la fila;
  - con referencias: la deja **archivada** (inactiva, stock 0) y oculta en todo el panel, en Compras y en la tienda.
- Con stock, primero pide confirmación con las unidades que se pierden.
- El resultado dice qué pasó: "Se eliminó …" o "Se eliminó …. Ya tenía ventas, así que se conserva solo en el historial."
- Si se vuelve a agregar la misma combinación que estaba archivada, se reactiva sola, con su historial y su SKU. Vale también cuando se la carga como "nueva" desde Compras.
- **Limpieza única** en la migración: borra las variantes inactivas sin ninguna referencia. No toca las activas.

### 4. Compras: buscador en cada producto
- El mismo buscador y contador en cada bloque de producto (aparece cuando tiene más de 8 variantes).
- Las filas que no coinciden se ocultan sin perder lo cargado. El encabezado dice "3 variantes con cantidad · N u.", y si alguna con cantidad quedó fuera de la búsqueda, lo avisa.

### 5. Ventana "Agregar variante" rehecha
- Título "Agregar variante · <producto>". Abierta desde un producto, viene fijo; desde el botón de arriba, se busca y se elige.
- **Para: [Un iPhone] [Universal]** solo si el producto todavía no tiene variantes. Una funda es siempre por iPhone; un protector o un cable, siempre universal.
- **Modelos**: se escribe para filtrar ("16 pro"), selección múltiple con chips, y "Todos" / "Ninguno".
- **Color**, **Motivo** o **Descripción** según el producto. Se fue la opción "Otra descripción" de esta ventana.
- **Stock y Precio** en la misma fila; el precio viene precargado. El **SKU** está en "Opciones avanzadas" y se arma solo.
- Una función transaccional crea una variante por modelo. Si la combinación ya existe, avisa en qué modelo y no duplica; si estaba archivada, la reactiva.
- El botón dice qué falta cuando está deshabilitado, el foco arranca en el primer campo y Enter confirma.
- "Sin modelo" pasó a llamarse **Universal** en todo el panel.

## Commits de esta tanda

| Commit | Qué |
|---|---|
| `3178e55` | SQL: agregar variantes, eliminar, limpieza; se van las funciones de la matriz |
| `6535d79` | Endpoints de agregar y eliminar; el panel solo ve variantes activas |
| `3d9e55a` | Panel: sin matriz, buscador, Eliminar, ventana nueva, buscador en Compras |
| `4e34196` | `npm run test:variantes`; pruebas de motivos adaptadas |
| (este) | Informe |

Tandas anteriores en la misma rama: colores (`cc0b92e` … `07b706f`), gestión por categoría (`7ddbb69` … `d962f8f`), motivos y "Editar colores" (`4e4e749` … `df9a3dd`), y tres ajustes de la tienda (`9af29f9`, `462f119`).

## Pruebas

| Comando | Resultado |
|---|---|
| `npm run test:variantes` (nuevo) | 133/133 OK |
| `npm run test:motivos` | 233/233 OK |
| `npm run test:colores` | 119/119 OK |
| `npm run test:compras` | 162/162 OK |
| `npm run test:unificar` | 180/180 OK |
| `npm run build` | OK |
| `npm run lint` | 0 errores, 1 advertencia que ya estaba (`adminApi.ts:27`) |

Qué cubre `test:variantes`:
- **Eliminar sin referencias**: se borra la fila. Con stock, bloquea hasta confirmar.
- **Eliminar con una venta, con una compra y con una reserva web**: en los tres casos queda archivada (inactiva, stock 0). No aparece en el panel, no cuenta en los chips de colores y no se ve en la tienda; el historial la sigue mostrando con producto, modelo y color.
- **Re-agregar una combinación archivada**: se reactiva la misma fila, con su SKU e historial. También desde Compras.
- **Limpieza única**: borra la inactiva sin referencias, deja la que tiene historial, no toca las activas y la segunda vez no borra nada.
- **Búsqueda**: tildes, mayúsculas, varias palabras en cualquier orden, SKU, "universal", y `iphone 16` trayendo los cuatro modelos. Con 139 variantes cada filtrado tarda menos de 5 ms.
- **Agregar variante**: varios modelos, precio copiado o indicado, SKU propio, duplicado sin duplicar, validaciones.
- **La ventana según el producto**: funda con colores, cable, protector con motivos, producto sin variantes y funda sin color.
- **Reglas que se mantienen**: colores rechazados en Accesorios, exclusión color / motivo, y el primer color asignado a las variantes existentes.
- **Permisos**: 401 sin sesión, y las funciones nuevas rechazan a `anon` y `authenticated`.

`test:colores-gestion` se eliminó: probaba los endpoints de agregar o quitar un color en todos los modelos de un producto, que ya no existen. Lo que seguía vigente (colores por categoría, rechazo en Accesorios, SKU en SQL igual al del panel, historial intacto) pasó a `test:variantes` y `test:motivos`.

### Un bug que apareció al probar
En la función nueva de agregar variantes, el cálculo del precio pisaba el resultado de "¿ya existe esta variante?", y una variante nueva se contaba como reactivada. Lo mostró la primera prueba y quedó corregido.

### Lo que no está probado
- **La interfaz en el navegador**: no corro Playwright ni saco capturas. La ventana nueva, el selector de modelos, el buscador, los chips y el celular a 390px están verificados solo por compilación y lint. Sí están probadas todas las llamadas que hacen y las reglas que deciden qué muestra la ventana.
- El foco automático y Enter para confirmar son comportamiento de navegador: no tienen prueba.

## Limpieza en la base local

**Borró 1 fila**: había una sola variante inactiva y no tenía ninguna referencia. No quedó ninguna archivada. En producción no consulté cuántas hay; la migración borra allá las inactivas sin historial y deja archivadas las demás.

## Decisiones

- **Al eliminar una variante con historial, su stock pasa a 0.** La confirmación dice que esas unidades se pierden, así que no las dejo guardadas a escondidas. El brief también decía que al re-agregarla vuelve "con su stock": como quedó en 0, vuelve con el stock y el precio que se cargan en ese momento. Si preferís que conserve el stock viejo, es un cambio chico.
- **Las fotos no se borran con la variante.** Son del producto (por color o motivo), no de una variante; no hay fotos "de la variante" que borrar. Si se elimina la última variante de un color, sus fotos quedan en el producto.
- **Eliminar sin stock no pide confirmación**, como decía el brief. Un toque borra la variante. Si en el uso real resulta demasiado fácil de tocar sin querer, se le agrega un "¿seguro?".
- **El panel pide solo variantes activas al servidor.** Así las archivadas no pueden aparecer en ninguna pantalla, tampoco en las que no toqué (Ventas).
- **Quitar un color por categoría** ahora usa la misma regla que Eliminar: borra las que no tienen historial y archiva las que sí. Sigue omitiendo las que tienen stock.
- **El primer color de un producto sin color** se asigna a todas sus variantes actuales aunque en la ventana se haya elegido un solo modelo. La ventana lo avisa antes y el botón pasa a "Asignar <color>".
- **En una funda que todavía no usa colores, el color es opcional**: se puede agregar una variante de otro modelo sin color. En una que ya usa colores, es obligatorio.
- **En "Nuevo producto" y en las filas nuevas de Compras sigue estando "Otra descripción"**, porque ahí es la única forma de cargar un cable con su descripción. Se sacó solo de la ventana "Agregar variante", que ya pide Descripción cuando corresponde.
- **El buscador de Compras aparece con más de 8 variantes**; con menos no aporta.
- **Las funciones de la tanda de gestión por producto** (`add_color_to_product`, `remove_color_from_product` y las dos de categoría sin modelos) quedaron en la base sin usar: están en una migración ya aplicada en producción y no se pueden editar. No tienen endpoint.

## Decisiones anteriores que siguen vigentes

- Un producto usa colores O motivos, nunca los dos; los colores no se ofrecen en Accesorios.
- El sistema nunca crea colores por su cuenta; al crear uno parecido a otro, avisa.
- En la tienda solo se muestran los colores y motivos con stock; con un solo color también se ve el círculo; las miniaturas muestran las fotos de todos y tocar una lo elige.
- Las variantes de Accesorios con color pasaron a motivo. **Sigue pendiente tu decisión sobre "Lentes de cámara con Glitter"**: sus 63 variantes Dorado / Negro / Plateado quedaron como motivos porque el pedido decía "Accesorios y sus tipos". Si tienen que seguir con colores, hay que limitar esa parte de la migración a Protectores de cargador antes de aplicarla.

## Lo que quedó sin hacer

- La prueba en navegador.
- Cambiar el color o motivo de una variante ya creada (hoy: eliminarla y agregarla).
- Ordenar a mano colores o motivos.
- Deshacer una eliminación con un click (se rehace agregando la variante de nuevo).

## Migraciones para producción

Una sola pendiente:

1. `supabase/migrations/20261008120000_motifs_and_matrix.sql`

Tiene que aplicarse **antes** de desplegar el frontend de esta rama. Al aplicarla, con los datos de producción, hace cuatro cosas que cambian datos:

1. Pasa a motivos los cuatro personajes y saca de la lista de colores los "Tipo X a …".
2. Pasa a motivo las variantes de Accesorios que tengan color (ver la decisión pendiente sobre los lentes).
3. **Borra las variantes inactivas que no tengan ventas, compras ni reservas.**
4. Reemplaza `create_purchase_grid` para que reactive variantes archivadas.

El punto 3 es el único que borra filas. No es reversible salvo restaurando un backup, así que conviene tener uno antes de aplicarla.

El preview de Vercel de la rama `colores` que está publicado corre código anterior a toda la parte de motivos. Cuando se pushee esta rama, el preview nuevo va a necesitar esta migración en la base a la que apunte.
