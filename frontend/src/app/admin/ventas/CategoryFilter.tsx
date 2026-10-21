"use client";

import { ChevronDown } from "lucide-react";
import type { CategoryGroup } from "@/lib/catalog";
import { adminChip } from "../adminStyles";

export type CategorySelection = { groupId: string; childId: string | null } | null;

/**
 * Filtro en dos pasos: arriba las categorías grandes (Fundas, Accesorios) y,
 * al elegir una, sus tipos debajo (Todas, Silicona, Transparentes…). Tocar de
 * nuevo la categoría elegida la suelta y vuelve a mostrarse todo.
 */
export default function CategoryFilter({
  groups,
  value,
  onChange,
}: {
  groups: CategoryGroup[];
  value: CategorySelection;
  onChange: (value: CategorySelection) => void;
}) {
  if (groups.length === 0) return null;
  const open = value ? groups.find((g) => g.id === value.groupId) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {groups.map((group) => {
          const active = value?.groupId === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onChange(active ? null : { groupId: group.id, childId: null })}
              aria-pressed={active}
              aria-expanded={group.children.length > 0 ? active : undefined}
              className={`${adminChip(active)} flex items-center gap-1.5`}
            >
              {group.name}
              {group.children.length > 0 && (
                <ChevronDown
                  aria-hidden="true"
                  className={`size-4 transition-transform duration-200 ${active ? "rotate-180" : ""}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {open && open.children.length > 0 && (
        <div
          role="radiogroup"
          aria-label={`Tipo de ${open.name.toLowerCase()}`}
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 motion-safe:animate-[lf-fade-in_150ms_ease-out] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {[{ id: null, name: "Todas" } as const, ...open.children].map((child) => {
            const active = value?.childId === child.id;
            return (
              <button
                key={child.id ?? "todas"}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ groupId: open.id, childId: child.id })}
                className={`h-9 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? "bg-admin-surface text-admin-text shadow-[inset_0_0_0_1.5px_var(--admin-ink)]"
                    : "text-admin-muted hover:bg-admin-surface hover:text-admin-text"
                }`}
              >
                {child.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
