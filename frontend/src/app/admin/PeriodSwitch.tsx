"use client";

/**
 * Selector de período en una sola píldora (Hoy · Semana · Mes…), para las
 * cabeceras del Inicio y del listado de ventas.
 */
export default function PeriodSwitch<T extends string>({
  options,
  value,
  onChange,
  label = "Período",
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full shrink-0 overflow-x-auto rounded-lg border border-admin-border bg-admin-surface p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`h-10 shrink-0 whitespace-nowrap rounded-md px-4 text-[15px] font-semibold transition-colors duration-200 ${
              active ? "bg-admin-ink text-admin-on-ink" : "text-admin-muted hover:text-admin-text"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
