"use client";

import { X } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { AdminIphoneModel } from "@/lib/adminApi";
import { filterBySearch } from "@/lib/variantSearch";
import { ADMIN_TEXT_MUTED, adminInput } from "../adminStyles";

/**
 * Elegir uno o varios modelos de iPhone escribiendo: el campo filtra la lista
 * ("16 pro"), Enter o un toque agrega el modelo como chip, y "Todos" los suma
 * a todos de una. Los elegidos se sacan con la "x" de su chip o con Borrar
 * cuando el campo está vacío.
 */
export default function ModelMultiSelect({
  models,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: {
  /** Todos los modelos, en orden. */
  models: AdminIphoneModel[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const chosen = new Set(value);
  const selected = models.filter((m) => chosen.has(m.id));
  const options = filterBySearch(
    models.filter((m) => !chosen.has(m.id)),
    text,
    (m) => m.name,
  );

  function add(id: string) {
    onChange(models.filter((m) => chosen.has(m.id) || m.id === id).map((m) => m.id));
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={`${listId}-input`} className="text-sm font-semibold text-admin-text">
          Modelos
        </label>
        <span className="flex gap-3 text-[13px]">
          <button
            type="button"
            disabled={disabled || value.length === models.length}
            onClick={() => onChange(models.map((m) => m.id))}
            className="font-semibold underline underline-offset-2 disabled:text-admin-muted disabled:no-underline"
          >
            Todos
          </button>
          <button
            type="button"
            disabled={disabled || value.length === 0}
            onClick={() => onChange([])}
            className="font-semibold underline underline-offset-2 disabled:text-admin-muted disabled:no-underline"
          >
            Ninguno
          </button>
        </span>
      </div>

      {selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((m) => (
            <li
              key={m.id}
              className="flex h-9 items-center gap-1 rounded-full border border-admin-border-strong bg-white pl-3 pr-1 text-sm font-semibold text-admin-text"
            >
              {m.name}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((id) => id !== m.id))}
                aria-label={`Quitar ${m.name}`}
                className="flex size-7 items-center justify-center rounded-full text-admin-muted hover:bg-admin-bg hover:text-admin-text"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        value={text}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open && text.trim() !== "" && options.length > 0) {
            // Elige el primero que coincide; no confirma la ventana.
            e.preventDefault();
            add(options[0].id);
          } else if (e.key === "Backspace" && text === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder={selected.length === 0 ? "Escribí para buscar: 16 pro" : "Sumar otro modelo"}
        className={adminInput()}
      />

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Modelos"
          className="absolute left-0 z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-admin-border-strong bg-white py-1 shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
        >
          {options.length === 0 ? (
            <li className={`px-3.5 py-2.5 ${ADMIN_TEXT_MUTED}`}>
              {value.length === models.length ? "Ya están todos." : "Ningún modelo con ese nombre."}
            </li>
          ) : (
            options.map((m, index) => (
              <li key={m.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  // mousedown: antes de que el campo pierda el foco y cierre la lista.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(m.id)}
                  className={`flex min-h-11 w-full items-center px-3.5 text-left text-[15px] hover:bg-admin-bg ${
                    index === 0 && text.trim() !== "" ? "bg-admin-bg font-semibold" : ""
                  }`}
                >
                  {m.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
