# Plan: agregar y quitar colores por producto y por categoría

Rama `colores` (sin pushear). Todo en local.

## Cómo está hoy

- `/admin/productos` es la pantalla **"Nuevo producto"**: un formulario para crear, sin lista de productos. La lista, con su buscador por nombre, vive en `/admin/catalogo`.
- Una variante se crea desde el panel con un SKU sugerido por `suggestSku(nombre, modelo, color)` (`productos/sku.ts`), al que se le suma `-2`, `-3`… si ya existe. El precio lo escribe quien la crea y `active` nace en `true`.
- `active = false` ya significa "dada de baja": la tienda no la muestra y las FK de `sale_items` / `purchase_items` impiden borrarla si tiene historial.
- Funciones SQL existentes: `create_sale`, `create_purchase`, `create_purchase_grid`, `last_purchase_costs`, `reorder_product_images`, `sync_colors_from_variants`. Ninguna crea variantes en bloque.
- Accesorios es la categoría de tope con slug `accesorios`; sus tipos cuelgan de ella por `parent_id`.

## Qué se hace

### Dónde va la interfaz
En **`/admin/catalogo`**, no en `/admin/productos`: ahí están la lista y el buscador que el pedido da por existentes. Duplicar la lista en "Nuevo producto" sería tener dos pantallas para lo mismo.

### SQL (una migración, solo `service_role`)
- `category_is_accessory(category_id)`: sube por `parent_id` buscando el slug `accesorios`.
- `suggest_sku(producto, modelo, color)`: la misma lógica de `sku.ts`, en SQL. Una prueba compara las dos.
- `add_color_to_product`, `remove_color_from_product`, `add_color_to_category`, `remove_color_from_category`, cada una con un parámetro extra `p_dry_run` para la vista previa: hace lo mismo y lo deshace (o no escribe), y devuelve el mismo resumen. Así la vista previa y la acción real no pueden dar números distintos.

### API
`POST /api/products/[id]/colors`, `DELETE /api/products/[id]/colors/[colorId]`, y las dos equivalentes bajo `/api/categories/[id]/colors`.

### Interfaz
- `ColorField` gana buscador y la opción de marcar colores "ya lo tiene".
- En cada producto de Catálogo: sección "Colores" con chips y "+ Agregar color".
- Filtro por categoría en Catálogo; al elegir una que no sea de Accesorios aparece "Colores de <categoría>".

### Pruebas
`npm run test:colores-gestion`, con categorías, productos y colores propios.
