import { Search, X } from "lucide-react";
import { adminInput } from "./adminStyles";

/**
 * Buscador de una lista (variantes de un producto, en Catálogo y en Compras):
 * el campo, un contador "12 de 139" mientras hay algo escrito y una "x" para
 * limpiar. Filtrar lo hace quien lo usa (ver lib/variantSearch).
 */
export default function SearchBox({
  value,
  onChange,
  shown,
  total,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Cuántas quedan después de filtrar. */
  shown: number;
  total: number;
  label: string;
  placeholder: string;
}) {
  const active = value.trim() !== "";
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-admin-muted"
        />
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && active) {
              e.stopPropagation();
              onChange("");
            }
          }}
          placeholder={placeholder}
          aria-label={label}
          className={adminInput({ prefix: "icon", suffix: true })}
        />
        {active && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Limpiar la búsqueda"
            title="Limpiar"
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-admin-muted hover:text-admin-text"
          >
            <X aria-hidden="true" className="size-[18px]" />
          </button>
        )}
      </div>
      {active && (
        <p role="status" className="text-[13px] text-admin-muted">
          <span className="font-mono tabular-nums">
            {shown} de {total}
          </span>
        </p>
      )}
    </div>
  );
}
