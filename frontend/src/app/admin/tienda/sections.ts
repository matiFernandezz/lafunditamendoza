import type { SubnavSection } from "../SubnavSidebar";

// Secciones de Tienda (sidebar en desktop, pestañas en mobile).
export const TIENDA_SECTIONS: SubnavSection[] = [
  { href: "/admin/tienda/secciones", label: "Secciones", hint: "Orden y títulos de la home" },
  { href: "/admin/tienda", label: "Carrusel", hint: "Las fotos de la portada" },
  { href: "/admin/tienda/categorias", label: "Categorías", hint: "La foto de cada mosaico" },
  { href: "/admin/tienda/nuevos", label: "Funditas más vendidas", hint: "Las fundas que giran" },
  { href: "/admin/tienda/ultimos", label: "Últimos ingresos", hint: "Qué productos y en qué orden" },
  { href: "/admin/tienda/comunidad", label: "Comunidad", hint: "Textos y fotos de clientes" },
  { href: "/admin/tienda/nosotros", label: "Nosotros", hint: "Texto, fotos y redes" },
];
