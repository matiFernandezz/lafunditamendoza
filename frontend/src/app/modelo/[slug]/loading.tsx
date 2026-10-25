import PageLoading from "@/components/PageLoading";

// De una página de este tipo a otra (otro producto, otra categoría, otro modelo)
// Next no vuelve a mostrar la carga de la raíz: va esta, con el mismo logo.
export default function Loading() {
  return <PageLoading />;
}
