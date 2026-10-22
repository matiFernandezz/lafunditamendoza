import type { SubnavSection } from "../SubnavSidebar";

// Secciones de Tienda (sidebar en desktop, pestañas en mobile).
export const TIENDA_SECTIONS: SubnavSection[] = [
  { href: "/admin/tienda/secciones", label: "Secciones", hint: "Orden y títulos de la home" },
  { href: "/admin/tienda", label: "Carrusel", hint: "Las fotos de la portada" },
  { href: "/admin/tienda/categorias", label: "Categorías", hint: "La foto de cada mosaico" },
  { href: "/admin/tienda/nuevos", label: "Funditas más vendidas", hint: "Las fundas que giran" },
];
