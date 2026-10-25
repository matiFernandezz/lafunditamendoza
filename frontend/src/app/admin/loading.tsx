import AdminLoading from "./AdminLoading";

// Mientras carga una pantalla del panel: el logo, sin tapar el menú (este
// loading va adentro del layout del panel, no reemplaza el sidebar).
export default function Loading() {
  return <AdminLoading label="Cargando la pantalla" />;
}
