"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ADMIN_LABEL } from "../adminStyles";

export type ComboboxOption = {
  id: string;
  label: string;
  sublabel?: string;
};

/**
 * Reemplazo del <select> nativo para cuando el texto de las opciones puede ser
 * largo: el navegador corta el <option> con "…" y no da forma de evitarlo.
 * Acá el nombre completo se ve siempre, con wrap a varias líneas si hace falta.
 */
export default function Combobox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  options: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className={ADMIN_LABEL}>
        {label}
      </label>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-admin-border bg-white px-3 text-left text-sm text-admin-text"
      >
        {selected ? (
          <span className="min-w-0 truncate">
            <span className="truncate">{selected.label}</span>
            {selected.sublabel && (
              <span className="ml-1.5 truncate text-[13px] text-admin-muted">{selected.sublabel}</span>
            )}
          </span>
        ) : (
          <span className="text-admin-muted">{placeholder}</span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-admin-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-admin-border bg-white py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-admin-muted">No hay opciones</li>
          ) : (
            options.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className={`block min-h-10 w-full px-3 py-2 text-left text-sm ${
                    o.id === value ? "bg-admin-bg font-semibold" : "text-admin-text hover:bg-admin-bg"
                  }`}
                >
                  <span className="block break-words">{o.label}</span>
                  {o.sublabel && (
                    <span className="block break-words text-[13px] text-admin-muted">{o.sublabel}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
