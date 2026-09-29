# Informe — admin con el diseño de `design/`

Trabajo hecho de corrido, **solo en local**: nada aplicado a la base de producción, sin push, sin tocar Vercel ni Railway. Cada parte tiene su commit para poder revisarla o revertirla por separado.

---

## Parte 1 — Relevamiento de las pantallas del admin en `design/`

Fuente: `design/ui_kits/admin/` (`AdminShell.jsx`, `VentasScreen.jsx`, `HistorialScreen.jsx`, `CatalogoScreen.jsx`, `ComprasScreens.jsx`, `WebVentasScreen.jsx`, `adminUI.jsx`, `README.md`) y `design/tokens/admin.css`.

Referencias: **(a)** ya existe, solo cambia la apariencia · **(b)** hay que construirla.

### Estructura general (shell)
| Función del diseño | Estado |
|---|---|
| Barra negra con el logo recortado y la etiqueta "Panel" | (a) |
| Desktop: solapas con ícono dentro de la barra negra, "Salir" a la derecha | (a) |
| Mobile: barra inferior fija con las solapas e íconos (al alcance del pulgar) + barra negra arriba con logo y "Salir" | (a) |
| Controles de 48px (botones principales de 56px), texto de inputs de 16px, radio 6px, títulos en Space Grotesk | (a) |
| Solapa "Web" con contador rojo de reservas pendientes | **(b)** — depende de "Ventas web" |
| Solapa "Nuevo producto" (en el repo se llama "Productos") | (a) — mismo destino, cambia el nombre |

### Login
| Función | Estado |
|---|---|
| Email + contraseña, error, botón "Entrar" | (a) |
| Cabecera negra con el logo grande y "Panel de administración" | (a) |
| Botón para mostrar/ocultar la contraseña | **(b)** |

### Ventas
| Función | Estado |
|---|---|
| Buscador de productos | (a) |
| Filtro con chips | (a) — el repo filtra **por categoría** |
| Filtro con chips **por línea de iPhone** (11…18) y búsqueda por modelo ("cherry 15 pro") | **(b)** |
| Tarjeta por producto con miniatura y categoría; filas por variante con stock ("Stock 5", "Quedan 2", "Sin stock", "2 en la venta") | (a) |
| Carrito con sumar/restar (restar hasta 0 quita el producto) | (a) |
| Descuento Sin / 10% / 15% / **20%** / Otro, con subtotal, descuento y total a cobrar | (a) — existía sin el 20% |
| Medio de pago con íconos, botón "Cobrar $ X" | (a) |
| Mobile: barra flotante "Ver venta" y la venta en una hoja desde abajo | (a) |
| Aviso "Venta registrada" con total, medio y descuento | (a) |

### Historial
| Función | Estado |
|---|---|
| Período Hoy / Semana / Mes / Personalizado | (a) |
| Tarjetas: total ingresado (con ticket promedio), efectivo, transferencia, cantidad de ventas | (a) |
| Lista de ventas desplegable con el detalle y el desglose del descuento | (a) |
| Anular con motivo obligatorio y confirmación de unidades | (a) |
| Anuladas apagadas y tachadas, con su motivo, sin sumar | (a) |
| Pestaña "Más vendidos" | (a) |
| **Motivos rápidos** (chips "Se cargó dos veces", "El cliente devolvió la funda", "Error de precio") | **(b)** |
| Etiqueta "Web" en ventas que vienen de la tienda | **(b)** — depende de "Ventas web" |

### Catálogo
| Función | Estado |
|---|---|
| Filtros: buscador, modelo, stock (Todos / Con stock / Sin stock) | (a) |
| Buscador que también encuentra por modelo, color o categoría | **(b)** — el repo busca por nombre |
| Productos como acordeón (miniatura, variantes, unidades, "N sin stock") | (a) — misma información, otro layout |
| Editar nombre | (a) |
| Fotos: subir, reordenar, quitar, la primera es la principal | (a) |
| Fotos: **subir varias a la vez** y **arrastrar para reordenar** | **(b)** |
| Cambiar el precio de todos los modelos con confirmación | (a) |
| Fila de variante con stock y precio y un solo "Guardar" | (a) — la API ya acepta los dos juntos |
| Agregar variante (modal) | (a) |

### Compras
| Función | Estado |
|---|---|
| Proveedor + alta de proveedor | (a) |
| Buscar y agregar productos; cantidad, costo, quitar; "hoy hay X → quedan Y" | (a) |
| Resumen con unidades y costo total + "Registrar compra" | (a) |

### Nuevo producto
| Función | Estado |
|---|---|
| Datos: nombre, descripción, categoría | (a) |
| Armar **todas las variantes modelo × color de una** (grilla por línea, colores, precio y stock por fila) | **(b)** — el repo crea el producto y agrega las variantes de a una |

### Ventas web
| Función | Estado |
|---|---|
| Reservas hechas desde la tienda (pendiente / pagada / cancelada, vencimiento de 24 h, marcar pagada, cancelar devolviendo stock, WhatsApp al cliente) | **(b)** — no existe; requiere carrito/checkout en la tienda |
