import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-5 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        No encontramos esa página
      </h1>
      <p className="text-graphite">Puede que el link esté viejo o que la categoría ya no exista.</p>
      <Link
        href="/"
        className="inline-flex h-14 items-center rounded-2xl bg-ink px-6 font-medium text-paper transition-transform duration-200 active:scale-[0.98]"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
