import LoadingLogo from "@/components/LoadingLogo";

/** Mientras carga algo del panel: el logo que respira, en el color del texto del panel. */
export default function AdminLoading({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex justify-center py-12">
      <LoadingLogo size={56} label={label} className="text-admin-text" />
    </div>
  );
}
