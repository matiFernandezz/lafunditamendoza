repo: matiFernandezz/lafunditamendoza
branch: main
path: frontend/src

## Last sync
date: 2026-09-28T21:42:06Z

### Updated in this project
- Panel /admin: login, ventas con descuento, historial, catálogo, compras, nuevo producto (mobile + desktop)
- tokens/admin.css desde las --admin-* de globals.css
- Tienda: carrusel hero, líneas 17/18, desktop

## Screen map
| Screen | Repo files |
|---|---|
| ui_kits/storefront · Home | frontend/src/app/page.tsx, components/HeroCarousel.tsx, components/IphoneModelStrip.tsx, components/ProductTile.tsx |
| ui_kits/storefront · Categoría | frontend/src/app/categoria/[slug]/page.tsx, components/ModelFilter.tsx |
| ui_kits/storefront · Modelo | frontend/src/app/modelo/[slug]/page.tsx |
| ui_kits/storefront · Producto | frontend/src/app/producto/[id]/page.tsx, components/ProductDetail.tsx, components/ProductGallery.tsx |
| ui_kits/storefront · Nosotros | frontend/src/app/nosotros/page.tsx |
| components/navigation/SiteHeader | frontend/src/components/AppShell.tsx |
| ui_kits/admin · Login | frontend/src/app/admin/login/page.tsx |
| ui_kits/admin · Shell | frontend/src/app/admin/AdminTopBar.tsx, admin/layout.tsx, admin/adminStyles.ts |
| ui_kits/admin · Ventas | frontend/src/app/admin/ventas/page.tsx, CartPanel.tsx, ProductGrid.tsx, utils.ts |
| ui_kits/admin · Historial | frontend/src/app/admin/historial/page.tsx, SaleRow.tsx, VoidSaleDialog.tsx, periods.ts |
| ui_kits/admin · Catálogo | frontend/src/app/admin/catalogo/BulkPriceEditor.tsx, VariantNumberInput.tsx, ProductImageGallery.tsx |
| ui_kits/admin · Compras | frontend/src/app/admin/compras/SupplierField.tsx |
| tokens/admin.css | frontend/src/app/globals.css |
| tokens/* | DESIGN.md, frontend/src/app/globals.css, frontend/src/lib/layout.ts |
