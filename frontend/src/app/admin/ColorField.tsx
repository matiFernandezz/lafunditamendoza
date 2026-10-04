"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AdminApiError, createColor, type AdminColor } from "@/lib/adminApi";
import { ADMIN_TEXT_MUTED, adminButton, adminInput } from "./adminStyles";

const DEFAULT_NEW_HEX = "#9ca3af";

/** Círculo de un color (borde fino para que el blanco se vea sobre blanco). */
export function ColorDot({ hex, size = 18 }: { hex: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full border border-black/20"
      style={{ width: size, height: size, backgroundColor: hex }}
    />
  );
}

type Mode = "list" | "new" | "text";

/**
 * Elegir el color de una variante de la lista `colors` (con su círculo), o
 * crear uno nuevo ahí mismo. El valor es el nombre del color, que es lo que
 * guarda la variante. "Otra descripción" queda para lo que no es un color
 * ("Tipo C a C"): ese texto no entra en la lista de colores.
 */
export default function ColorField({
  value,
  onChange,
  colors,
  onColorCreated,
  label,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  colors: AdminColor[];
  onColorCreated: (color: AdminColor) => void;
  /** Rótulo accesible ("Color, fila 2"). */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState(DEFAULT_NEW_HEX);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const trimmed = value.trim();
  const selected = colors.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());

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

  function toggle() {
    setOpen((o) => !o);
    setMode("list");
    setError(null);
  }

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  async function handleCreate() {
    const name = newName.trim();
    if (name === "" || saving) return;
    // Si ya existe con ese nombre, se elige ese en vez de fallar.
    const existing = colors.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      pick(existing.name);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await createColor({ name, hex: newHex });
      onColorCreated(res.data);
      setNewName("");
      setNewHex(DEFAULT_NEW_HEX);
      pick(res.data.name);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo crear el color.");
    } finally {
      setSaving(false);
    }
  }

  const option = "flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2 text-left text-[15px] hover:bg-admin-bg";

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={toggle}
        className={`flex h-12 w-full min-w-0 items-center gap-2.5 rounded-md border bg-white px-3.5 text-left text-base text-admin-text transition-colors duration-200 disabled:opacity-60 ${
          open ? "border-admin-ink" : "border-admin-border-strong"
        }`}
      >
        {selected ? (
          <>
            <ColorDot hex={selected.hex} />
            <span className="min-w-0 flex-1 truncate">{selected.name}</span>
          </>
        ) : trimmed !== "" ? (
          <span className="min-w-0 flex-1 truncate">{trimmed}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-admin-muted">Sin color</span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 text-admin-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={listId}
          className="absolute left-0 z-20 mt-1 w-full min-w-[240px] rounded-md border border-admin-border-strong bg-white py-1 shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
        >
          {mode === "list" && (
            <>
              <ul role="listbox" aria-label={label} className="max-h-60 overflow-y-auto">
                <li role="option" aria-selected={trimmed === ""}>
                  <button type="button" onClick={() => pick("")} className={`${option} text-admin-muted`}>
                    Sin color
                  </button>
                </li>
                {colors.map((color) => (
                  <li key={color.id} role="option" aria-selected={color.id === selected?.id}>
                    <button
                      type="button"
                      onClick={() => pick(color.name)}
                      className={`${option} ${color.id === selected?.id ? "bg-admin-bg font-semibold" : ""}`}
                    >
                      <ColorDot hex={color.hex} />
                      <span className="min-w-0 flex-1 break-words">{color.name}</span>
                      {!color.assigned && <span className={ADMIN_TEXT_MUTED}>sin color asignado</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-admin-border">
                <button type="button" onClick={() => setMode("new")} className={`${option} font-semibold`}>
                  <Plus aria-hidden="true" className="size-[18px]" />
                  Crear color nuevo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setText(selected ? "" : trimmed);
                    setMode("text");
                  }}
                  className={`${option} text-admin-muted`}
                >
                  Otra descripción (no es un color)
                </button>
              </div>
            </>
          )}

          {mode === "new" && (
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newHex}
                  onChange={(e) => setNewHex(e.target.value)}
                  aria-label="Color"
                  className="h-12 w-12 shrink-0 cursor-pointer rounded-md border border-admin-border-strong bg-white p-1"
                />
                <input
                  type="text"
                  value={newName}
                  autoFocus
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  placeholder="Nombre: Verde menta"
                  aria-label="Nombre del color nuevo"
                  className={adminInput()}
                />
              </div>
              {error && (
                <p role="alert" className="text-[13px] font-medium text-admin-danger">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode("list")} className={adminButton("secondary", "sm")}>
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || newName.trim() === ""}
                  className={adminButton("primary", "sm")}
                >
                  {saving ? "Creando…" : "Crear"}
                </button>
              </div>
            </div>
          )}

          {mode === "text" && (
            <div className="flex flex-col gap-2 p-3">
              <input
                type="text"
                value={text}
                autoFocus
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") pick(text.trim());
                }}
                placeholder="Ej.: tipo C a C, 20W"
                aria-label="Descripción de la variante"
                className={adminInput()}
              />
              <p className={ADMIN_TEXT_MUTED}>Para lo que distingue a la variante y no es un color.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode("list")} className={adminButton("secondary", "sm")}>
                  Volver
                </button>
                <button type="button" onClick={() => pick(text.trim())} className={adminButton("primary", "sm")}>
                  Usar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
