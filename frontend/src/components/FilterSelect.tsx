"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Selector de un filtro del listado (modelo de iPhone, orden). El servidor ya
 * calculó a qué URL lleva cada opción: acá solo se navega, así el estado queda
 * en la URL y se puede compartir.
 * "lead": el filtro principal ("Elegí tu iPhone"), grande. "inline": secundario.
 */
export default function FilterSelect({
  id,
  label,
  value,
  options,
  variant = "lead",
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string; href: string }[];
  variant?: "lead" | "inline";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const lead = variant === "lead";

  function onChange(next: string) {
    const option = options.find((o) => o.value === next);
    if (option) startTransition(() => router.replace(option.href, { scroll: false }));
  }

  return (
    <div className={lead ? "" : "flex items-center gap-3"}>
      <label
        htmlFor={id}
        className={
          lead
            ? "mb-2 block font-display text-title font-semibold tracking-tight text-ink"
            : "shrink-0 text-sm text-graphite"
        }
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none bg-transparent font-medium transition-colors duration-200 hover:border-ink ${
            lead
              ? "h-14 rounded-2xl border border-ink pl-4 pr-12 text-base"
              : "h-11 rounded-full border border-graphite pl-4 pr-10 text-sm"
          }`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 ${lead ? "right-4" : "right-3.5"}`}
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </div>
      <p className="sr-only" aria-live="polite">
        {isPending ? "Actualizando…" : ""}
      </p>
    </div>
  );
}
