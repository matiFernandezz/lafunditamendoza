import type { PurchaseStatus, PurchaseSummary } from "@/lib/adminApi";
import type { SubnavSection } from "../SubnavSidebar";

/** Avisa al sidebar de Compras que un pedido se creó, cambió o se borró. */
export const PURCHASES_CHANGED = "lf-purchases-changed";

// Secciones de Compras (sidebar en desktop, pestañas en mobile).
export const COMPRAS_SECTIONS: SubnavSection[] = [
  { href: "/admin/compras", label: "Pedidos", hint: "Lo pagado y su estado", matchPrefix: "/admin/compras/pedidos" },
  { href: "/admin/compras/nuevo", label: "Nuevo pedido", hint: "Cargar lo que se pidió" },
  { href: "/admin/compras/proveedores", label: "Proveedores", hint: "Contacto, pago y envío" },
];

/** Los cuatro pasos, en orden. El stock entra en el último. */
export const PURCHASE_STEPS: { status: PurchaseStatus; label: string; hint: string }[] = [
  { status: "armando", label: "Armando", hint: "Todavía no se pagó" },
  { status: "pagado", label: "Pagado", hint: "Pagado, sin despachar" },
  { status: "en_camino", label: "En camino", hint: "Ya lo despacharon" },
  { status: "recibida", label: "Recibido", hint: "Llegó y sumó el stock" },
];

export const STATUS_LABEL: Record<PurchaseStatus, string> = {
  armando: "Armando",
  pagado: "Pagado",
  en_camino: "En camino",
  recibida: "Recibido",
};

export const STATUS_BADGE: Record<PurchaseStatus, "neutral" | "warn" | "ink" | "ok"> = {
  armando: "neutral",
  pagado: "warn",
  en_camino: "warn",
  recibida: "ink",
};

/** Lo que se paga por el pedido: mercadería + envío. */
export function purchaseTotal(p: { total_amount: number; shipping_cost: number }) {
  return Number(p.total_amount) + Number(p.shipping_cost);
}

/** Pedidos pagados que todavía no llegaron (plata en tránsito). */
export function pendingPurchases(purchases: PurchaseSummary[]) {
  return purchases.filter((p) => p.status === "pagado" || p.status === "en_camino");
}

const dayFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

/** "2026-10-20" (un día, sin zona) → "20 oct". */
export function formatDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return dayFormat.format(new Date(y, m - 1, d));
}

/** Instante ISO → "20 oct" en la hora local. */
export function formatInstant(iso: string) {
  return dayFormat.format(new Date(iso));
}
