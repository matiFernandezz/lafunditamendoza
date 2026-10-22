import { SubnavTabs } from "../SubnavSidebar";
import { TIENDA_SECTIONS } from "./sections";

/**
 * Tienda: lo que se ve en la home. En desktop las secciones van en el segundo
 * sidebar (TiendaSidebar, lo arma AdminShell); en mobile, como pestañas arriba.
 */
export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <SubnavTabs title="Tienda" sections={TIENDA_SECTIONS} />
      {children}
    </div>
  );
}
