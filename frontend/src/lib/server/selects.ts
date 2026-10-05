// Columnas que devuelven los endpoints del panel (las mismas que devolvía Express).

export const PRODUCT_SELECT = "id, name, description, active, category_id, image_url, created_at";

export const VARIANT_SELECT =
  "id, product_id, iphone_model_id, color, color_id, motif_id, sku, price, cost_price, stock_quantity, active";

export const PRODUCT_IMAGE_SELECT = "id, url, sort_order, color_id, motif_id";

export const MOTIF_SELECT = "id, name, slug, sort_order";

export const COLOR_SELECT = "id, name, slug, hex, assigned, sort_order";

const VARIANT_WITH_NAMES = `variant:product_variants (
      id, sku, color,
      product:products ( id, name ),
      iphone_model:iphone_models ( id, name )
    )`;

export const SALE_SELECT = `id, sale_date, payment_method, channel, subtotal, total_amount, discount_percent, discount_amount,
  notes, status, voided_at, void_reason,
  web_order:web_orders ( code ),
  sale_items (
    id, variant_id, quantity, unit_price,
    ${VARIANT_WITH_NAMES}
  )`;

const WEB_ORDER_ITEMS_SELECT = `items:web_order_items (
    id, quantity, unit_price,
    ${VARIANT_WITH_NAMES}
  )`;

export const WEB_ORDER_SELECT = `id, code, public_token, customer_name, customer_phone, status, total_amount,
  created_at, expires_at, paid_at, cancelled_at, cancel_reason, sale_id, ${WEB_ORDER_ITEMS_SELECT}`;

// Lo que ve el cliente: sin su teléfono ni ids internos de la venta.
export const WEB_ORDER_PUBLIC_SELECT = `code, customer_name, status, total_amount, created_at, expires_at, ${WEB_ORDER_ITEMS_SELECT}`;
