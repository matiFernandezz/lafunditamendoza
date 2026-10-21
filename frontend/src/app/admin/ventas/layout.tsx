import { SubnavTabs } from "../SubnavSidebar";
import { VENTAS_SECTIONS } from "./sections";

/**
 * Ventas: en desktop las secciones van en el segundo sidebar (VentasSidebar,
 * lo arma AdminShell); en mobile y tablet, como pestañas arriba.
 */
export default function VentasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <SubnavTabs title="Ventas" sections={VENTAS_SECTIONS} />
      {children}
    </div>
  );
}
