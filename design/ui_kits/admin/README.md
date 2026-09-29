# Panel de administración (/admin)

Herramienta interna para vender en la feria desde el celular. Mobile primero; `desktop.html` muestra la misma app en computadora.

Base: `frontend/src/app/admin/*` del repo (AdminTopBar, adminStyles.ts, ventas/CartPanel, historial/SaleRow + VoidSaleDialog, catalogo/BulkPriceEditor + VariantNumberInput + ProductImageGallery, compras/SupplierField, login). Colores `--admin-*` de globals.css → `tokens/admin.css`.

Cambios respecto del repo (pedidos por la marca):
- Controles de 48px (CTA 56px) en vez de 40px, texto de input 16px (evita zoom en iOS).
- Navegación inferior fija en mobile (5 solapas, al alcance del pulgar); barra negra con logo arriba.
- Descuento % en la venta (Sin / 10 / 15 / 20 / Otro) con subtotal, descuento y total a cobrar; el historial marca "−15%".
- Galería: tocar una foto → Antes / Después / Quitar (en desktop también se arrastra).
- Motivos rápidos al anular una venta.
- Nuevo producto arma las variantes modelo × color de una.

Archivos: `adminData.js` (datos de ejemplo + helpers), `adminUI.jsx` (primitivas locales), `AdminShell.jsx` (barra + nav + login), `VentasScreen.jsx`, `HistorialScreen.jsx`, `CatalogoScreen.jsx`, `ComprasScreens.jsx` (compras + nuevo producto), `AdminApp.jsx` (estado compartido: una venta baja stock, anular/comprar lo devuelve).

Íconos: Lucide (el repo usa `lucide-react`), por CDN.
