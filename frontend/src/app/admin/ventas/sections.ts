import type { SubnavSection } from "../SubnavSidebar";

// Secciones de Ventas (sidebar en desktop, pestañas en mobile). En un archivo
// sin "use client" para que el layout, que es de servidor, pueda leerlas.
export const VENTAS_SECTIONS: SubnavSection[] = [
  { href: "/admin/ventas", label: "Nueva venta", hint: "Fundas y accesorios" },
  { href: "/admin/ventas/listado", label: "Listado", hint: "Cobradas y anuladas" },
];
