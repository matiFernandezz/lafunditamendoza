import { redirect } from "next/navigation";

// Nuevo producto ahora vive en Stock.
export default function ProductosPage() {
  redirect("/admin/stock/nuevo");
}
