import { redirect } from "next/navigation";

// El catálogo ahora es Stock.
export default function CatalogoPage() {
  redirect("/admin/stock");
}
