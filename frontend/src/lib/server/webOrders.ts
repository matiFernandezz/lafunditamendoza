import "server-only";
import { jsonError } from "@/lib/server/http";

// Reservas hechas desde la tienda. El stock se mueve solo en las funciones
// SQL (create_web_order, mark_web_order_paid, cancel_web_order): los Route
// Handlers validan la entrada y traducen los errores.

export const WEB_ORDER_STATUSES = ["pendiente", "pagada", "cancelada"] as const;
export type WebOrderStatus = (typeof WEB_ORDER_STATUSES)[number];

const STATUS_BY_CODE: Record<string, number> = { WO400: 400, WO404: 404, WO409: 409 };

/** Error de una función SQL de reservas → respuesta HTTP (el mensaje es el de la función). */
export function webOrderRpcError(error: { code: string; message: string }) {
  return jsonError(STATUS_BY_CODE[error.code] ?? 500, error.message);
}
