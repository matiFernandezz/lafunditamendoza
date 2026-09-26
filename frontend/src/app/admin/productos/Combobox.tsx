"use client";

import { useEffect, useId, useRef, useState } from "react";

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
      <label htmlFor={id} className="mb-1 block text-base font-medium">
        {label}
      </label>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-graphite bg-transparent px-4 py-3 text-left text-base"
      >
        {selected ? (
          <span className="min-w-0">
            <span className="block break-words">{selected.label}</span>
            {selected.sublabel && (
              <span className="block break-words text-sm text-graphite">{selected.sublabel}</span>
            )}
          </span>
        ) : (
          <span className="text-graphite">{placeholder}</span>
        )}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-graphite bg-paper py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-graphite">No hay opciones</li>
          ) : (
            options.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className={`block min-h-11 w-full px-4 py-2.5 text-left ${
                    o.id === value ? "bg-rule" : "active:bg-rule"
                  }`}
                >
                  <span className="block break-words">{o.label}</span>
                  {o.sublabel && (
                    <span className="block break-words text-sm text-graphite">{o.sublabel}</span>
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
