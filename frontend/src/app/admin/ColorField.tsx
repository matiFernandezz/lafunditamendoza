"use client";

import { ChevronDown, Pencil, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AdminApiError, createColor, createMotif, type AttributeKind } from "@/lib/adminApi";
import AttributeManager from "./AttributeManager";
import { ADMIN_TEXT_MUTED, adminButton, adminInput } from "./adminStyles";
import { KIND_TEXT, addToLibrary, useAttributeLibrary } from "./attributeLibrary";

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
type Option = { id: string; name: string; hex?: string; assigned?: boolean };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Selector de un color (con su círculo) o de un motivo, de la lista del panel:
 * con buscador, "Crear … nuevo" ahí mismo y "Editar …", que abre el modal para
 * renombrar, unir y eliminar. El valor es el nombre, que es lo que guarda la
 * variante. "Otra descripción" queda para lo que no es ni color ni motivo
 * ("Tipo C a C"): ese texto no entra en ninguna lista.
 */
export default function ColorField({
  value,
  onChange,
  label,
  kind = "color",
  disabled = false,
  className = "",
  placeholder,
  allowEmpty = true,
  allowText = true,
  takenIds,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Rótulo accesible ("Color, fila 2"). */
  label: string;
  kind?: AttributeKind;
  disabled?: boolean;
  className?: string;
  /** Texto del botón cuando no hay nada elegido. */
  placeholder?: string;
  /** Ofrecer "Sin color" / "Sin motivo". */
  allowEmpty?: boolean;
  /** Ofrecer "Otra descripción". */
  allowText?: boolean;
  /** Los que ya están en uso: se muestran marcados y no se pueden elegir. */
  takenIds?: Set<string>;
}) {
  const library = useAttributeLibrary();
  const text = KIND_TEXT[kind];
  const options: Option[] = kind === "color" ? library.colors : library.motifs;
  const none = `Sin ${text.one}`;

  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState(DEFAULT_NEW_HEX);
  const [freeText, setFreeText] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const trimmed = value.trim();
  const selected = options.find((o) => o.name.toLowerCase() === trimmed.toLowerCase());

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

  // Búsqueda por nombre, sin distinguir mayúsculas ni tildes.
  const term = fold(search.trim());
  const visible = term === "" ? options : options.filter((o) => fold(o.name).includes(term));

  function toggle() {
    setOpen((o) => !o);
    setMode("list");
    setSearch("");
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
    const existing = options.find((o) => o.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      pick(existing.name);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = kind === "color" ? await createColor({ name, hex: newHex }) : await createMotif(name);
      // Antes de elegirlo: quien recibe el onChange ya lo encuentra en la lista.
      addToLibrary(kind, res.data);
      setNewName("");
      setNewHex(DEFAULT_NEW_HEX);
      pick(res.data.name);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : `No se pudo crear el ${text.one}.`);
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
            {selected.hex && <ColorDot hex={selected.hex} />}
            <span className="min-w-0 flex-1 truncate">{selected.name}</span>
          </>
        ) : trimmed !== "" ? (
          <span className="min-w-0 flex-1 truncate">{trimmed}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-admin-muted">{placeholder ?? none}</span>
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
              <div className="border-b border-admin-border p-2">
                <input
                  type="search"
                  value={search}
                  autoFocus
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Buscar ${text.one}`}
                  aria-label={`Buscar ${text.one}`}
                  className={adminInput()}
                />
              </div>
              <ul role="listbox" aria-label={label} className="max-h-60 overflow-y-auto">
                {allowEmpty && term === "" && (
                  <li role="option" aria-selected={trimmed === ""}>
                    <button type="button" onClick={() => pick("")} className={`${option} text-admin-muted`}>
                      {none}
                    </button>
                  </li>
                )}
                {visible.map((item) => {
                  const taken = takenIds?.has(item.id) ?? false;
                  return (
                    <li key={item.id} role="option" aria-selected={item.id === selected?.id} aria-disabled={taken}>
                      <button
                        type="button"
                        onClick={() => pick(item.name)}
                        disabled={taken}
                        className={`${option} disabled:opacity-50 disabled:hover:bg-white ${
                          item.id === selected?.id ? "bg-admin-bg font-semibold" : ""
                        }`}
                      >
                        {item.hex && <ColorDot hex={item.hex} />}
                        <span className="min-w-0 flex-1 break-words">{item.name}</span>
                        {taken ? (
                          <span className={ADMIN_TEXT_MUTED}>ya lo tiene</span>
                        ) : (
                          item.assigned === false && <span className={ADMIN_TEXT_MUTED}>sin color asignado</span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {visible.length === 0 && (
                  <li className={`px-3.5 py-2.5 ${ADMIN_TEXT_MUTED}`}>Ningún {text.one} con ese nombre.</li>
                )}
              </ul>
              <div className="border-t border-admin-border">
                <button
                  type="button"
                  onClick={() => {
                    // Lo que se venía buscando es, casi seguro, el nombre del nuevo.
                    if (visible.length === 0) setNewName(search.trim());
                    setMode("new");
                  }}
                  className={`${option} font-semibold`}
                >
                  <Plus aria-hidden="true" className="size-[18px]" />
                  {text.new}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setManaging(true);
                  }}
                  className={option}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  {text.edit}
                </button>
                {allowText && (
                  <button
                    type="button"
                    onClick={() => {
                      setFreeText(selected ? "" : trimmed);
                      setMode("text");
                    }}
                    className={`${option} text-admin-muted`}
                  >
                    Otra descripción (no es un {text.one})
                  </button>
                )}
              </div>
            </>
          )}

          {mode === "new" && (
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                {kind === "color" && (
                  <input
                    type="color"
                    value={newHex}
                    onChange={(e) => setNewHex(e.target.value)}
                    aria-label="Tono"
                    className="h-12 w-12 shrink-0 cursor-pointer rounded-md border border-admin-border-strong bg-white p-1"
                  />
                )}
                <input
                  type="text"
                  value={newName}
                  autoFocus
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  placeholder={kind === "color" ? "Nombre: Verde menta" : "Nombre: Spiderman"}
                  aria-label={`Nombre del ${text.one} nuevo`}
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
                value={freeText}
                autoFocus
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") pick(freeText.trim());
                }}
                placeholder="Ej.: tipo C a C, 20W"
                aria-label="Descripción de la variante"
                className={adminInput()}
              />
              <p className={ADMIN_TEXT_MUTED}>Para lo que distingue a la variante y no es un {text.one}.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode("list")} className={adminButton("secondary", "sm")}>
                  Volver
                </button>
                <button type="button" onClick={() => pick(freeText.trim())} className={adminButton("primary", "sm")}>
                  Usar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {managing && <AttributeManager kind={kind} onClose={() => setManaging(false)} />}
    </div>
  );
}
