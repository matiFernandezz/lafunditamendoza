import { redirect } from "next/navigation";

// El historial ahora es Ventas › Listado.
export default function HistorialPage() {
  redirect("/admin/ventas/listado");
}
