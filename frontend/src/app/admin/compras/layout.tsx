import { SubnavTabs } from "../SubnavSidebar";
import { COMPRAS_SECTIONS } from "./purchaseStatus";

/**
 * Compras: en desktop las secciones van en el segundo sidebar (ComprasSidebar,
 * lo arma AdminShell); en mobile y tablet, como pestañas arriba.
 */
export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <SubnavTabs title="Compras" sections={COMPRAS_SECTIONS} />
      {children}
    </div>
  );
}
