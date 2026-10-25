"use client";

import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FilterPopover, { optionPill } from "./FilterPopover";

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;
const digits = (value: string) => value.replace(/\D/g, "");

/**
 * Orden y rango de precio del listado, en el mismo popup que modelo y tipo
 * (abre hacia abajo, alineado a la derecha). El orden son links con la URL ya
 * calculada; el precio arma la URL sobre `priceHref` (la vista sin precio).
 */
export default function SortPicker({
  options,
  sort,
  price,
  priceHref,
}: {
  options: { value: string; label: string; href: string }[];
  sort: string;
  price: { desde?: number; hasta?: number };
  priceHref: string;
}) {
  const router = useRouter();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const current = options.find((o) => o.value === sort);
  const hasPrice = price.desde !== undefined || price.hasta !== undefined;

  const priceLabel = hasPrice
    ? price.desde && price.hasta
      ? `${pesos(price.desde)} – ${pesos(price.hasta)}`
      : price.desde
        ? `Desde ${pesos(price.desde)}`
        : `Hasta ${pesos(price.hasta!)}`
    : null;

  function withPrice(nextDesde: string, nextHasta: string) {
    const url = new URL(priceHref, window.location.origin);
    if (nextDesde) url.searchParams.set("desde", nextDesde);
    if (nextHasta) url.searchParams.set("hasta", nextHasta);
    return `${url.pathname}${url.search}`;
  }

  const input =
    "h-11 w-full min-w-0 rounded-full border border-rule bg-transparent pl-7 pr-3 text-sm tabular-nums text-ink outline-none transition-colors duration-200 placeholder:text-graphite/70 focus:border-ink md:w-36";

  return (
    <FilterPopover
      id="selector-orden"
      align="end"
      label={priceLabel ? `${current?.label} · ${priceLabel}` : (current?.label ?? "Ordenar")}
      // Al abrir, los campos arrancan con el rango aplicado.
      onOpen={() => {
        setDesde(price.desde?.toString() ?? "");
        setHasta(price.hasta?.toString() ?? "");
      }}
      icon={<ArrowUpDown aria-hidden="true" className="size-4" strokeWidth={1.75} />}
    >
      {(close) => (
        <>
          <p className="px-1 text-xs font-semibold uppercase tracking-label text-graphite">Ordenar por</p>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <Link
                key={o.value}
                href={o.href}
                scroll={false}
                onClick={close}
                aria-current={o.value === sort ? "true" : undefined}
                className={optionPill(o.value === sort)}
              >
                {o.label}
              </Link>
            ))}
          </div>

          <form
            className="flex flex-col gap-3 border-t border-rule/60 pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              close();
              router.replace(withPrice(desde, hasta), { scroll: false });
            }}
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-label text-graphite">Precio</p>
              {hasPrice && (
                <Link
                  href={priceHref}
                  scroll={false}
                  onClick={close}
                  className="text-xs font-medium text-graphite underline underline-offset-2 transition-colors duration-200 hover:text-ink"
                >
                  Limpiar
                </Link>
              )}
            </div>
            {/* Desde – Hasta y Aplicar en una sola fila. */}
            <div className="flex items-center gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Precio desde</span>
                <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-graphite">
                  $
                </span>
                <input
                  inputMode="numeric"
                  placeholder="Desde"
                  value={desde ? Number(desde).toLocaleString("es-AR") : ""}
                  onChange={(e) => setDesde(digits(e.target.value))}
                  className={input}
                />
              </label>
              <span aria-hidden="true" className="text-graphite">
                –
              </span>
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Precio hasta</span>
                <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-graphite">
                  $
                </span>
                <input
                  inputMode="numeric"
                  placeholder="Hasta"
                  value={hasta ? Number(hasta).toLocaleString("es-AR") : ""}
                  onChange={(e) => setHasta(digits(e.target.value))}
                  className={input}
                />
              </label>
              <button
                type="submit"
                className="ml-1 inline-flex h-11 shrink-0 items-center rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-opacity duration-200 hover:opacity-85"
              >
                Aplicar
              </button>
            </div>
          </form>
        </>
      )}
    </FilterPopover>
  );
}
