"use client";

import Link from "next/link";
import { useState } from "react";
import type { ModelLine } from "@/lib/catalog";
import { PAGE_PADDING } from "@/lib/layout";
import Chip from "./Chip";

/**
 * Franja "Elegí tu iPhone": un número grande por línea (11…17) que despliega
 * sus modelos en píldoras. Una línea con un solo modelo va directo a él.
 * Los bordes llegan al viewport (la página cancela su padding); el padding
 * vuelve acá, en el contenido.
 */
export default function ModelStrip({ lines }: { lines: ModelLine[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = lines.find((line) => line.key === openKey);

  return (
    <div className="border-y border-rule">
      <p
        className={`flex items-center gap-2 py-4 text-sm font-semibold uppercase tracking-label text-graphite ${PAGE_PADDING}`}
      >
        Elegí tu iPhone <span aria-hidden="true">→</span>
      </p>

      <div
        className={`grid grid-cols-[repeat(auto-fit,minmax(76px,1fr))] justify-items-center gap-x-2 gap-y-5 pb-6 pt-1 ${PAGE_PADDING}`}
      >
        {lines.map((line) => {
          const single = line.models.length === 1;
          const isOpen = openKey === line.key;
          // Círculo sutil detrás del número: marca la línea abierta, y en hover
          // anticipa cuál se va a elegir.
          const number = (
            <span
              className={`flex size-14 items-center justify-center rounded-full font-display text-model font-semibold leading-none tracking-tight transition-colors duration-200 md:size-16 ${
                isOpen ? "bg-ink/10" : "group-hover:bg-ink/5"
              }`}
            >
              {line.label}
            </span>
          );
          const caption = (
            <span className="text-xs text-graphite">
              {single ? line.models[0].name : `iPhone ${line.label}`}
            </span>
          );

          return single ? (
            <Link
              key={line.key}
              href={`/modelo/${line.models[0].slug}`}
              className="group flex min-w-11 flex-col items-center gap-1 text-ink"
            >
              {number}
              {caption}
            </Link>
          ) : (
            <button
              key={line.key}
              type="button"
              onClick={() => setOpenKey(isOpen ? null : line.key)}
              aria-expanded={isOpen}
              className="group flex min-w-11 flex-col items-center gap-1 text-ink"
            >
              {number}
              {caption}
            </button>
          );
        })}
      </div>

      {open && (
        <div className={`flex flex-wrap gap-3 border-t border-rule py-4 ${PAGE_PADDING}`}>
          {open.models.map((model) => (
            <Chip key={model.id} size="sm" href={`/modelo/${model.slug}`}>
              {model.name}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
