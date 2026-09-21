import Link from "next/link";
import { getCategoryGroups } from "@/lib/catalog";

// Las categorías vienen de la base: sin esto Next pre-renderiza la home en el build y queda congelada.
export const dynamic = "force-dynamic";

const cardClass =
  "flex min-h-16 items-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base font-medium active:bg-zinc-100";

export default async function Home() {
  const groups = await getCategoryGroups();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">¿Qué estás buscando?</h1>
        <p className="mt-1 text-zinc-600">Elegí una categoría para ver lo que hay en stock.</p>
      </div>

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
          Todavía no hay categorías cargadas.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="mb-3 text-lg font-semibold">{group.name}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.children.length > 0 ? (
              group.children.map((child) => (
                <Link key={child.id} href={`/categoria/${child.id}`} className={cardClass}>
                  {child.name}
                </Link>
              ))
            ) : (
              <Link href={`/categoria/${group.id}`} className={cardClass}>
                Ver todo
              </Link>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
