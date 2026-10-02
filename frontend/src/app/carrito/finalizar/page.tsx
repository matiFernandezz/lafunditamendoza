import type { Metadata } from "next";
import CheckoutView from "@/components/store/CheckoutView";

export const metadata: Metadata = { title: "Finalizar compra · La Fundita" };

export default function FinalizarCompraPage() {
  return <CheckoutView />;
}
