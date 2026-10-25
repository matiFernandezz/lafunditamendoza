"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import type { TypeChip } from "@/lib/catalogFilters";
import FilterPopover, { optionPill } from "./FilterPopover";

/**
 * Selector de tipo del listado (Accesorios: straps, soportes, lentes…), en el
 * mismo popup que el de modelo: "Todos" y cada tipo en una píldora con su
 * cantidad chiquita. Cada opción es un link con la URL ya calculada por el servidor.
 */
export default function TypePicker({ chips, allLabel }: { chips: TypeChip[]; allLabel: string }) {
  const selected = chips.find((chip) => chip.selected && chip.slug !== null);

  return (
    <FilterPopover
      id="selector-tipo"
      label={selected ? selected.label : allLabel}
      icon={<LayoutGrid aria-hidden="true" className="size-4" strokeWidth={1.75} />}
    >
      {(close) => (
        <div className="flex min-w-0 flex-wrap items-center gap-2 md:max-w-[560px]">
          {chips.map((chip) => (
            <Link
              key={chip.slug ?? "todos"}
              href={chip.href}
              scroll={false}
              onClick={close}
              aria-current={chip.selected ? "true" : undefined}
              className={`${optionPill(chip.selected)} gap-1.5`}
            >
              {chip.label}
              <span className={`font-mono text-[11px] tabular-nums ${chip.selected ? "text-paper/70" : "text-graphite"}`}>
                {chip.count}
              </span>
            </Link>
          ))}
        </div>
      )}
    </FilterPopover>
  );
}
