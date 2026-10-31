"use client";

import Link from "next/link";
import { useState } from "react";
import FilterPopover, { optionPill } from "./FilterPopover";

export type ModelPickerLine = {
  key: string;
  /** available: si hay algo de esta vista para ese modelo (si no, va atenuado). */
  models: { slug: string; name: string; href: string; available: boolean }[];
};

/**
 * Selector de modelo del listado, en un popup: los números de línea (11…18),
 * como la franja de la home. Al tocar un número, sus modelos aparecen debajo,
 * ocupando el mismo ancho que la fila de números; una línea con un solo modelo
 * va directo a él. Cada opción es un link con la URL ya calculada por el servidor.
 */
export default function ModelPicker({
  lines,
  selected,
  allHref,
}: {
  lines: ModelPickerLine[];
  selected: { slug: string; name: string } | null;
  allHref: string;
}) {
  const selectedLine = lines.find((line) => line.models.some((m) => m.slug === selected?.slug))?.key ?? null;
  const [lineKey, setLineKey] = useState<string | null>(selectedLine);
  const line = lines.find((l) => l.key === lineKey);

  const number = (isActive: boolean) =>
    `flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold leading-none tracking-tight text-ink transition-colors duration-200 ${
      isActive ? "bg-ink/10" : "hover:bg-ink/5"
    }`;

  return (
    <FilterPopover
      id="selector-modelo"
      label={selected ? selected.name : "Todos los modelos"}
      // Al abrir, arranca mostrando la línea del modelo elegido.
      onOpen={() => setLineKey(selectedLine)}
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="size-4">
          <rect x="6" y="2.5" width="12" height="19" rx="3" />
          <path d="M10.5 18.5h3" strokeLinecap="round" />
        </svg>
      }
    >
      {(close) => (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Link
              href={allHref}
              scroll={false}
              onClick={close}
              aria-current={selected ? undefined : "true"}
              className={`${optionPill(!selected)} mr-1`}
            >
              Todos
            </Link>

            {lines.map((l) =>
              l.models.length === 1 ? (
                <Link
                  key={l.key}
                  href={l.models[0].href}
                  scroll={false}
                  onClick={close}
                  aria-label={l.models[0].name}
                  aria-current={selected?.slug === l.models[0].slug ? "true" : undefined}
                  className={number(selected?.slug === l.models[0].slug)}
                >
                  {l.key}
                </Link>
              ) : (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLineKey(lineKey === l.key ? null : l.key)}
                  aria-expanded={lineKey === l.key}
                  aria-label={`iPhone ${l.key}`}
                  className={number(lineKey === l.key)}
                >
                  {l.key}
                </button>
              ),
            )}
          </div>

          {/* Los modelos de la línea, debajo de los números y a su mismo ancho (columnas
              iguales), separados por una línea muy suave. */}
          {line && line.models.length > 1 && (
            <div
              key={line.key}
              className="flex w-0 min-w-full animate-[lf-fade-in_200ms_ease-out] flex-wrap gap-2 border-t border-rule/60 pt-3 motion-reduce:animate-none md:grid"
              style={{ gridTemplateColumns: `repeat(${line.models.length}, minmax(0, 1fr))` }}
            >
              {line.models.map((model) => {
                const isSelected = selected?.slug === model.slug;
                return (
                  <Link
                    key={model.slug}
                    href={model.href}
                    scroll={false}
                    onClick={close}
                    aria-current={isSelected ? "true" : undefined}
                    className={optionPill(isSelected, { available: model.available, cell: true })}
                  >
                    {model.name}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </FilterPopover>
  );
}
