import LoadingLogo from "@/components/LoadingLogo";

// Mientras carga una página de la tienda (el header queda fijo arriba): el logo
// en el centro. Aparece recién si la carga tarda más de 300 ms.
export default function Loading() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <LoadingLogo size={72} label="Cargando la página" />
    </div>
  );
}
