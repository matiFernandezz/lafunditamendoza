import Link from "next/link";
import ArrowMark from "@/components/ArrowMark";
import { getCategoryGroups, getProductCountsByCategory } from "@/lib/catalog";

// Las categorías vienen de la base: sin esto Next pre-renderiza la home en el build y queda congelada.
export const dynamic = "force-dynamic";

// Radio de 28px: el del cuerpo de un iPhone.
const tileClass =
  "group flex aspect-[4/5] flex-col justify-between rounded-[28px] border border-rule p-5 " +
  "transition-[background-color,border-color,color,transform] duration-200 ease-out " +
  "hover:border-ink hover:bg-ink hover:text-paper active:scale-[0.98] active:border-ink active:bg-ink active:text-paper";

function Tile({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className={tileClass}>
      <span className="flex items-start justify-between">
        <span className="text-sm tabular-nums text-graphite transition-colors duration-200 group-hover:text-paper/70 group-active:text-paper/70">
          {count === 1 ? "1 producto" : `${count} productos`}
        </span>
        <ArrowMark className="h-4 w-6 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
      </span>
      <span className="font-display text-xl font-medium leading-tight tracking-tight">{label}</span>
    </Link>
  );
}

export default async function Home() {
  const [groups, counts] = await Promise.all([getCategoryGroups(), getProductCountsByCategory()]);

  return (
    <div className="space-y-16 md:space-y-24">
      <section className="lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-8">
        <h1 className="font-display text-[clamp(3rem,14.5vw,8rem)] font-semibold leading-[0.92] tracking-[-0.035em]">
          <span className="sr-only">iPhone 11 a 17 Pro Max</span>
          <span aria-hidden="true">
            <span className="hero-mask">
              <span className="hero-rise block whitespace-nowrap">
                iPhone 11
                <ArrowMark
                  strokeWidth={7}
                  className="hero-arrow ml-[0.2em] inline-block h-[0.6em] w-auto align-baseline"
                />
              </span>
            </span>
            <span className="hero-mask">
              <span className="hero-rise hero-rise-late block">17 Pro Max</span>
            </span>
          </span>
        </h1>
        <p className="mt-6 max-w-[34ch] text-base text-graphite md:mt-8 md:text-xl lg:mt-0 lg:max-w-[20ch] lg:pb-3">
          Fundas y accesorios para tu iPhone. Elegí tu modelo y mirá lo que hay en stock.
        </p>
      </section>

      <section aria-label="Categorías" className="space-y-12">
        {groups.length === 0 && (
          <p className="rounded-[28px] border border-dashed border-rule p-8 text-center text-graphite">
            Todavía no hay categorías cargadas.
          </p>
        )}

        {groups.map((group) => (
          <div key={group.id}>
            <h2 className="font-display text-2xl font-medium tracking-tight">{group.name}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {group.children.length > 0 ? (
                group.children.map((child) => (
                  <Tile
                    key={child.id}
                    href={`/categoria/${child.id}`}
                    label={child.name}
                    count={counts[child.id] ?? 0}
                  />
                ))
              ) : (
                <Tile
                  href={`/categoria/${group.id}`}
                  label="Ver todo"
                  count={counts[group.id] ?? 0}
                />
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
