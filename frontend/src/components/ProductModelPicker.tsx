"use client";

import { useState } from "react";
import FilterPopover, { optionPill } from "./FilterPopover";
import HScroll from "./HScroll";

export type PickerModel = { id: string; name: string; sort_order: number };

/** Línea del modelo: "14" para "iPhone 14 Pro"; si no tiene número, el nombre entero. */
const lineOf = (name: string) => name.match(/^iPhone (\d+)/i)?.[1] ?? name;

/**
 * "Elegí tu modelo" de la ficha de producto, igual que el filtro de Fundas (sin
 * "Todos"): una píldora con el modelo elegido que abre debajo los números de línea en una fila y, al tocar uno, sus
 * modelos abajo en columnas iguales; se abre siempre, aunque la línea tenga uno
 * solo. Salen todos los modelos: los que el producto no tiene en stock se ven
 * grises y tachados, y no se pueden elegir (así quien tiene un 15 Pro entiende
 * que no hay para su modelo, en vez de creer que solo existe el 15).
 */
export default function ProductModelPicker({
  models,
  availableIds,
  value,
  onChange,
}: {
  models: PickerModel[];
  /** Los modelos con stock; el resto se muestra sin poder elegirse. */
  availableIds: ReadonlySet<string>;
  value: string;
  onChange: (modelId: string) => void;
}) {
  const sorted = [...models].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
  // Líneas en orden numérico (las sin número, al final).
  const lines = [...new Set(sorted.map((m) => lineOf(m.name)))]
    .sort((a, b) => (Number(a) || Infinity) - (Number(b) || Infinity))
    .map((key) => ({ key, models: sorted.filter((m) => lineOf(m.name) === key) }));

  const selected = sorted.find((m) => m.id === value);
  const selectedLine = selected ? lineOf(selected.name) : null;
  const [lineKey, setLineKey] = useState<string | null>(selectedLine);
  const line = lines.find((l) => l.key === lineKey);

  // Un número sin ningún modelo con stock va atenuado (se puede abrir y ver cuáles faltan).
  const number = (isActive: boolean, hasStock: boolean) =>
    `flex size-12 shrink-0 items-center justify-center rounded-full font-display text-xl font-semibold leading-none tracking-tight transition-colors duration-200 ${
      hasStock ? "text-ink" : "text-ink/35"
    } ${isActive ? "bg-ink/10" : "hover:bg-ink/5"}`;

  return (
    <div>
      <p className="mb-2 font-medium">Elegí tu modelo</p>
      <FilterPopover
        id="modelo-detalle"
        align="below"
        label={selected ? selected.name : "Elegir modelo"}
        // Al abrir, arranca mostrando la línea del modelo elegido.
        onOpen={() => setLineKey(selectedLine)}
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
            className="size-4"
          >
            <rect x="6" y="2.5" width="12" height="19" rx="3" />
            <path d="M10.5 18.5h3" strokeLinecap="round" />
          </svg>
        }
      >
        {(close) => (
          <>
            {/* Con muchos números se reparten de punta a punta (la fila ocupa el ancho
                de la tarjeta, igual que los modelos); con pocos (14 y 15) van juntos a
                la izquierda, para que no queden separados por un hueco. */}
            <HScroll className={`h-12 gap-2 ${lines.length >= 6 ? "justify-between" : "justify-start"}`}>
              {lines.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => {
                    setLineKey(l.key);
                    // Con un solo modelo en la línea, y con stock, queda elegido (y se ve abajo).
                    if (l.models.length === 1 && availableIds.has(l.models[0].id)) onChange(l.models[0].id);
                  }}
                  aria-expanded={lineKey === l.key}
                  aria-label={`iPhone ${l.key}`}
                  data-active={selectedLine === l.key ? "true" : undefined}
                  className={number(
                    lineKey === l.key,
                    l.models.some((m) => availableIds.has(m.id)),
                  )}
                >
                  {l.key}
                </button>
              ))}
            </HScroll>

            {/* Los modelos de la línea, debajo de los números, en columnas iguales y
                separados por una línea suave. */}
            {line && (
              <div
                key={line.key}
                className="flex animate-[lf-fade-in_200ms_ease-out] flex-wrap gap-2 border-t border-rule/60 pt-3 motion-reduce:animate-none md:grid"
                // Columnas iguales: la tarjeta toma el ancho que necesitan los nombres
                // en un renglón, hasta su máximo (el de los 8 números); si no entran,
                // las columnas se achican parejas y el nombre baja a dos renglones.
                // Con 4 modelos (17, 18) van de a 2 por renglón.
                style={{
                  gridTemplateColumns: `repeat(${line.models.length > 3 ? 2 : line.models.length}, minmax(0, 1fr))`,
                }}
              >
                {line.models.map((m) =>
                  availableIds.has(m.id) ? (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onChange(m.id);
                        close();
                      }}
                      aria-pressed={m.id === value}
                      className={optionPill(m.id === value, { cell: true })}
                    >
                      {m.name}
                    </button>
                  ) : (
                    <button
                      key={m.id}
                      type="button"
                      disabled
                      aria-label={`${m.name}, sin stock`}
                      title="Sin stock por ahora"
                      className="inline-flex min-h-9 cursor-not-allowed items-center justify-center rounded-full border border-transparent bg-ink/[0.07] px-3 py-1.5 text-center text-sm font-medium leading-tight text-graphite/60 line-through"
                    >
                      {m.name}
                    </button>
                  ),
                )}
              </div>
            )}
            {line && line.models.some((m) => !availableIds.has(m.id)) && (
              <p className="text-[13px] text-graphite">Los modelos tachados no tienen stock por ahora.</p>
            )}
          </>
        )}
      </FilterPopover>
    </div>
  );
}
