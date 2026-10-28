// Columnas que devuelven los endpoints del panel (las mismas que devolvía Express).

export const PRODUCT_SELECT = "id, name, description, active, category_id, image_url, created_at, stock_groups_custom";

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
  notes, status, voided_at, void_reason, customer_name,
  web_order:web_orders ( code ),
  sale_items (
    id, variant_id, quantity, unit_price, unit_cost,
    ${VARIANT_WITH_NAMES}
  )`;

const WEB_ORDER_ITEMS_SELECT = `items:web_order_items (
    id, quantity, unit_price,
    ${VARIANT_WITH_NAMES}
  )`;

export const WEB_ORDER_SELECT = `id, code, public_token, customer_name, customer_phone, status, total_amount,
  subtotal_amount, coupon_code, discount_percent, discount_amount,
  created_at, expires_at, paid_at, cancelled_at, cancel_reason, sale_id, ${WEB_ORDER_ITEMS_SELECT}`;

// Lo que ve el cliente: sin su teléfono ni ids internos de la venta.
export const WEB_ORDER_PUBLIC_SELECT = `code, customer_name, status, total_amount, subtotal_amount, coupon_code, discount_percent, discount_amount, created_at, expires_at, ${WEB_ORDER_ITEMS_SELECT}`;

export const SUPPLIER_SELECT = "id, name, contact_info, payment_method, shipping_cost, notes";

export const PURCHASE_LIST_SELECT = `id, number, purchase_date, created_at, status, total_amount, shipping_cost,
  paid_at, shipped_at, received_at, notes,
  supplier:suppliers ( id, name ),
  purchase_items ( quantity )`;

export const PURCHASE_DETAIL_SELECT = `id, number, purchase_date, created_at, status, total_amount, shipping_cost,
  paid_at, shipped_at, received_at, notes,
  supplier:suppliers ( ${SUPPLIER_SELECT} ),
  purchase_items (
    id, quantity, unit_cost,
    variant:product_variants (
      id, sku, color, price, stock_quantity,
      product:products ( id, name ),
      iphone_model:iphone_models ( id, name )
    )
  )`;
