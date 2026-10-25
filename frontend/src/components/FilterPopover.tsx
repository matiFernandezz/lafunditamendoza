"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Píldora de filtro del listado que se abre como popup: un velo oscurece la
 * página y una tarjeta flota a la derecha de la píldora (en mobile, debajo),
 * sin correr los productos. Se cierra al tocar afuera o con Escape; el
 * contenido recibe `close` para cerrarla al elegir.
 */
export default function FilterPopover({
  id,
  icon,
  label,
  onOpen,
  align = "start",
  children,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  onOpen?: () => void;
  /** "end": para una píldora pegada a la derecha; en compu la tarjeta abre a su izquierda. En mobile
      las píldoras van una debajo de la otra contra el margen izquierdo, así que siempre abre debajo, hacia la derecha. */
  align?: "start" | "end";
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open) onOpen?.();
    setOpen((o) => !o);
  }

  return (
    <div ref={rootRef} className={`relative ${open ? "z-30" : ""}`}>
      {/* El velo está adentro del componente, así que el "tocar afuera" no lo ve:
          tocarlo cierra por su cuenta (con click, para no tocar lo que hay debajo). */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 -z-10 animate-[lf-fade-in_200ms_ease-out] bg-ink/25 motion-reduce:animate-none"
        />
      )}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
        className={`relative inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full border border-ink pl-4 pr-3.5 text-sm transition-colors duration-200 ${
          open ? "bg-ink text-paper" : "hover:bg-ink hover:text-paper"
        }`}
      >
        {icon}
        <span className="font-semibold">{label}</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
          aria-hidden="true"
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : "-rotate-90"}`}
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>

      {open && (
        <div
          id={id}
          className={`absolute top-[calc(100%+8px)] flex w-[calc(100vw-3rem)] animate-[lf-subnav-in_200ms_ease-out] flex-col gap-3 rounded-2xl border border-rule bg-paper p-3 shadow-[0_16px_40px_rgb(18_18_18/0.18)] motion-reduce:animate-none md:w-max ${
            align === "end"
              ? "left-0 md:left-auto md:right-[calc(100%+12px)] md:top-[-12px]"
              : "left-0 md:left-[calc(100%+12px)] md:top-[-12px]"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Píldora de opción dentro de un popup de filtro. */
export function optionPill(isSelected: boolean, { available = true, cell = false } = {}) {
  // cell: en una grilla; si el nombre no entra, baja a dos renglones.
  return `inline-flex shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors duration-200 ${
    cell ? "min-h-9 px-3 py-1.5 text-center leading-tight" : "h-9 whitespace-nowrap px-3.5"
  } ${
    isSelected
      ? "border-ink bg-ink text-paper"
      : `border-rule hover:border-ink ${available ? "text-ink" : "text-graphite/70"}`
  }`;
}
