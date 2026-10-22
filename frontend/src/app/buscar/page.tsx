import type { Metadata } from "next";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import ProductGrid from "@/components/ProductGrid";
import { getCategoryGroups, searchProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Buscar · La Fundita" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Resultados del buscador del header: /buscar?q=… */
export default async function SearchPage(props: PageProps<"/buscar">) {
  const query = (first((await props.searchParams).q) ?? "").trim().slice(0, 80);
  const [products, groups] = await Promise.all([searchProducts(query), getCategoryGroups()]);

  return (
    <div className="space-y-8 md:space-y-10">
      <PageHeader
        title={query ? `“${query}”` : "Buscar"}
        count={query ? products.length : undefined}
        back={{ href: "/", label: "Inicio" }}
      />

      {/* Para buscar de nuevo sin volver arriba: funciona aunque no cargue JavaScript. */}
      <form action="/buscar" role="search" className="flex max-w-xl gap-2">
        <label htmlFor="buscar-pagina" className="sr-only">
          Buscar productos
        </label>
        <input
          id="buscar-pagina"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Buscar fundas, modelos, colores…"
          className="h-14 w-full rounded-2xl border border-graphite bg-transparent px-4 text-base text-ink outline-none placeholder:text-graphite/70 focus:border-ink"
        />
        <button
          type="submit"
          className="h-14 shrink-0 rounded-2xl bg-ink px-6 font-medium text-paper transition-transform duration-200 active:scale-[0.98]"
        >
          Buscar
        </button>
      </form>

      {!query ? (
        <EmptyState>Escribí el nombre de una funda, un modelo de iPhone o un color.</EmptyState>
      ) : products.length === 0 ? (
        <EmptyState>
          No encontramos nada con “{query}”. Probá con otra palabra o mirá{" "}
          {groups.map((group, index) => (
            <span key={group.id}>
              {index > 0 && (index === groups.length - 1 ? " o " : ", ")}
              <Link href={`/categoria/${group.slug}`} className="font-medium text-ink underline underline-offset-[3px]">
                {group.name.toLowerCase()}
              </Link>
            </span>
          ))}
          .
        </EmptyState>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
