"use client";

import Link from "next/link";
import { useState } from "react";
import type { ModelLine } from "@/lib/catalog";
import { PAGE_PADDING } from "@/lib/layout";

// 8 botones grandes (una por línea: 11...17, Air) para no abrumar con los
// 22 modelos reales de una. Un solo modelo por línea (Air) va directo; el
// resto expande sus variantes (base / Pro / Pro Max) para llegar a los 22.
// El borde horizontal llega al viewport (el padre cancela el padding de la
// página); el propio padding vuelve a ponerse acá, en el contenido.
export default function IphoneModelStrip({ lines }: { lines: ModelLine[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="border-y border-rule">
      <div className={`flex items-center gap-2 py-4 text-sm font-semibold tracking-wide text-graphite ${PAGE_PADDING}`}>
        <span>ELEGÍ TU IPHONE</span>
        <span aria-hidden="true">→</span>
      </div>

      <div className={`flex flex-wrap gap-x-6 gap-y-4 pb-5 sm:gap-x-10 ${PAGE_PADDING}`}>
        {lines.map((line) => {
          const single = line.models.length === 1;
          const isOpen = openKey === line.key;

          if (single) {
            return (
              <Link
                key={line.key}
                href={`/modelo/${line.models[0].slug}`}
                className="group flex flex-col items-center gap-1"
              >
                <span className="font-display text-3xl font-black tracking-tight transition-opacity group-hover:opacity-60 sm:text-4xl">
                  {line.label}
                </span>
                <span className="text-xs text-graphite">{line.models[0].name}</span>
              </Link>
            );
          }

          return (
            <button
              key={line.key}
              type="button"
              onClick={() => setOpenKey(isOpen ? null : line.key)}
              aria-expanded={isOpen}
              className="group flex flex-col items-center gap-1"
            >
              <span
                className={`font-display text-3xl font-black tracking-tight transition-opacity sm:text-4xl ${
                  isOpen ? "" : "group-hover:opacity-60"
                }`}
              >
                {line.label}
              </span>
              <span className="text-xs text-graphite">iPhone {line.label}</span>
            </button>
          );
        })}
      </div>

      {lines.map((line) =>
        line.models.length > 1 && openKey === line.key ? (
          <div
            key={line.key}
            className={`flex flex-wrap gap-3 border-t border-rule py-4 ${PAGE_PADDING}`}
          >
            {line.models.map((model) => (
              <Link
                key={model.id}
                href={`/modelo/${model.slug}`}
                className="rounded-full border border-graphite px-4 py-2 text-sm font-medium transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-paper"
              >
                {model.name}
              </Link>
            ))}
          </div>
        ) : null,
      )}
    </div>
  );
}
