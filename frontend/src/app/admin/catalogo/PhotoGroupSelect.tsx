"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ColorDot } from "../ColorField";
import { ADMIN_TEXT_MUTED, adminInput } from "../adminStyles";

/** De qué son las fotos que se ven: generales (id null), o de un color o motivo. */
export type PhotoGroup = { id: string | null; name: string; hex?: string; count: number };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * "Fotos de: …": elegir de qué color o motivo son las fotos que se están
 * viendo, con buscador por nombre. "General" va siempre primero; cada opción
 * muestra cuántas fotos tiene.
 */
export default function PhotoGroupSelect({
  groups,
  value,
  onChange,
  kindLabel,
}: {
  /** Primero "General", después los colores o motivos del producto. */
  groups: PhotoGroup[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** "color" o "motivo", para el buscador. */
  kindLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = groups.find((g) => g.id === value) ?? groups[0];

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

  const term = fold(search.trim());
  const [general, ...rest] = groups;
  const visible = term === "" ? rest : rest.filter((g) => fold(g.name).includes(term));
  const option = "flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2 text-left text-[15px] hover:bg-admin-bg";

  const row = (group: PhotoGroup) => (
    <li key={group.id ?? "general"} role="option" aria-selected={group.id === selected.id}>
      <button
        type="button"
        onClick={() => {
          onChange(group.id);
          setOpen(false);
        }}
        className={`${option} ${group.id === selected.id ? "bg-admin-bg font-semibold" : ""}`}
      >
        {group.hex && <ColorDot hex={group.hex} />}
        <span className="min-w-0 flex-1 break-words">{group.name}</span>
        <span className={`font-mono ${group.count === 0 ? "text-admin-danger" : "text-admin-muted"} text-xs`}>
          {group.count === 1 ? "1 foto" : `${group.count} fotos`}
        </span>
      </button>
    </li>
  );

  return (
    <div ref={rootRef} className="relative sm:max-w-[320px]">
      <button
        type="button"
        aria-label={`Fotos de: ${selected.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((o) => !o);
          setSearch("");
        }}
        className={`flex h-12 w-full items-center gap-2.5 rounded-md border bg-white px-3.5 text-left text-base text-admin-text transition-colors duration-200 ${
          open ? "border-admin-ink" : "border-admin-border-strong"
        }`}
      >
        <span className={ADMIN_TEXT_MUTED}>Fotos de:</span>
        {selected.hex && <ColorDot hex={selected.hex} />}
        <span className="min-w-0 flex-1 truncate font-semibold">{selected.name}</span>
        <span className="font-mono text-xs text-admin-muted">{selected.count}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 text-admin-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={listId}
          className="absolute left-0 z-20 mt-1 w-full min-w-[260px] rounded-md border border-admin-border-strong bg-white py-1 shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
        >
          <div className="border-b border-admin-border p-2">
            <input
              type="search"
              value={search}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar ${kindLabel}`}
              aria-label={`Buscar ${kindLabel}`}
              className={adminInput()}
            />
          </div>
          <ul role="listbox" aria-label="Fotos de" className="max-h-64 overflow-y-auto">
            {term === "" && row(general)}
            {visible.map(row)}
            {visible.length === 0 && term !== "" && (
              <li className={`px-3.5 py-2.5 ${ADMIN_TEXT_MUTED}`}>Ningún {kindLabel} con ese nombre.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
