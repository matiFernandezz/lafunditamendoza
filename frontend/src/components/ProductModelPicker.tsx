"use client";

import { useState } from "react";

export type PickerModel = { id: string; name: string; sort_order: number };

/** Línea del modelo: "14" para "iPhone 14 Pro"; si no tiene número, el nombre entero. */
const lineOf = (name: string) => name.match(/^iPhone (\d+)/i)?.[1] ?? name;

/**
 * "Elegí tu modelo" de la ficha de producto, como el selector de Fundas: un
 * número por línea (11…18) y, al tocarlo, sus modelos debajo, en orden. Si la
 * línea tiene un solo modelo, se elige solo, pero igual se muestra abajo. Solo
 * muestra los modelos que el producto tiene.
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
  const [lineKey, setLineKey] = useState<string | null>(selected ? lineOf(selected.name) : null);
  const line = lines.find((l) => l.key === lineKey);

  return (
    <div>
      <p id="modelo-detalle" className="mb-2 font-medium">
        Elegí tu modelo
        {selected && <span className="font-normal text-graphite"> — {selected.name}</span>}
      </p>

      <div role="group" aria-labelledby="modelo-detalle" className="flex flex-wrap gap-1.5">
        {lines.map((l) => {
          const single = l.models.length === 1;
          const active = lineKey === l.key;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => {
                setLineKey(l.key);
                if (single) onChange(l.models[0].id);
              }}
              aria-pressed={active}
              aria-label={`iPhone ${l.key}`}
              className={`flex h-12 min-w-12 items-center justify-center rounded-full px-3 font-display text-xl font-semibold leading-none tracking-tight transition-colors duration-200 ${
                active ? "bg-ink/10 text-ink" : "text-ink hover:bg-ink/5"
              }`}
            >
              {l.key}
            </button>
          );
        })}
      </div>

      {/* Los modelos de la línea elegida, separados por una línea suave. Se abre
          siempre, aunque la línea tenga uno solo: así se ve qué modelo quedó. */}
      {line && (
        <div
          key={line.key}
          className="mt-3 flex animate-[lf-fade-in_200ms_ease-out] flex-wrap gap-2 border-t border-rule pt-3 motion-reduce:animate-none"
        >
          {line.models.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              aria-pressed={m.id === value}
              className={`inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
                m.id === value ? "border-ink bg-ink text-paper" : "border-rule text-ink hover:border-ink"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
