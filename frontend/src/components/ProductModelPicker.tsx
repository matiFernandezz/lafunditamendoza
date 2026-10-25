"use client";

import { useState } from "react";
import FilterPopover, { optionPill } from "./FilterPopover";

export type PickerModel = { id: string; name: string; sort_order: number };

/** Línea del modelo: "14" para "iPhone 14 Pro"; si no tiene número, el nombre entero. */
const lineOf = (name: string) => name.match(/^iPhone (\d+)/i)?.[1] ?? name;

/**
 * "Elegí tu modelo" de la ficha de producto, igual que el filtro de Fundas (sin
 * "Todos"): una píldora con el modelo elegido que abre debajo los números de línea en una fila y, al tocar uno, sus
 * modelos abajo en columnas iguales; se abre siempre, aunque la línea tenga uno
 * solo. Solo los modelos que el producto tiene.
 */
export default function ProductModelPicker({
  models,
  value,
  onChange,
}: {
  models: PickerModel[];
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

  const number = (isActive: boolean) =>
    `flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold leading-none tracking-tight text-ink transition-colors duration-200 ${
      isActive ? "bg-ink/10" : "hover:bg-ink/5"
    }`;

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
            <div className="flex h-11 min-w-0 items-center gap-1.5 overflow-x-auto">
              {lines.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => {
                    setLineKey(l.key);
                    // Con un solo modelo en la línea, queda elegido (y se ve abajo).
                    if (l.models.length === 1) onChange(l.models[0].id);
                  }}
                  aria-expanded={lineKey === l.key}
                  aria-label={`iPhone ${l.key}`}
                  className={number(lineKey === l.key)}
                >
                  {l.key}
                </button>
              ))}
            </div>

            {/* Los modelos de la línea, debajo de los números, en columnas iguales y
                separados por una línea suave. */}
            {line && (
              <div
                key={line.key}
                className="flex animate-[lf-fade-in_200ms_ease-out] flex-wrap gap-2 border-t border-rule/60 pt-3 motion-reduce:animate-none md:grid"
                // Columnas iguales que nunca bajan del ancho del nombre: con pocos
                // números la tarjeta crece para que cada modelo entre en un renglón;
                // con muchos, las columnas se estiran al ancho de la fila.
                style={{ gridTemplateColumns: `repeat(${line.models.length}, minmax(max-content, 1fr))` }}
              >
                {line.models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      close();
                    }}
                    aria-pressed={m.id === value}
                    className={optionPill(m.id === value)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </FilterPopover>
    </div>
  );
}
