import LoadingLogo from "./LoadingLogo";

/**
 * Pantalla de carga de las páginas de la tienda (el header queda fijo arriba):
 * el logo en el centro, que aparece recién si la carga tarda más de 300 ms.
 * La usan los loading.tsx: el de la raíz y los de las páginas que se navegan
 * entre sí (de una ficha a otra, de Fundas a Accesorios, de un modelo a otro),
 * porque ahí Next no vuelve a mostrar el de la raíz.
 */
export default function PageLoading() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <LoadingLogo size={72} label="Cargando la página" />
    </div>
  );
}
