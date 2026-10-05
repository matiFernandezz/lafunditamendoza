"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getColors, getMotifs, type AdminColor, type AdminMotif, type AttributeKind } from "@/lib/adminApi";

// Listas de colores y de motivos del panel, compartidas por todas las
// pantallas: se piden una vez y cualquier selector que cree, renombre, una o
// elimine uno las actualiza para todos.

type Library = { colors: AdminColor[]; motifs: AdminMotif[]; loaded: boolean };

const EMPTY: Library = { colors: [], motifs: [], loaded: false };
let state: Library = EMPTY;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Se dispara cuando un cambio en la librería tocó variantes o fotos
 * (renombrar, unir, eliminar): las pantallas que muestran productos los
 * vuelven a pedir.
 */
export const LIBRARY_TOUCHED_PRODUCTS = "lf-attribute-library-touched-products";

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "es");

/** Vuelve a pedir colores y motivos. */
export function reloadLibrary(): Promise<void> {
  loading ??= Promise.all([getColors(), getMotifs()])
    .then(([colors, motifs]) => {
      state = { colors: colors.data, motifs: motifs.data, loaded: true };
      emit();
    })
    .catch(() => {
      // Sin conexión: los selectores quedan con lo que ya había.
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Suma uno recién creado sin esperar a recargar. */
export function addToLibrary(kind: AttributeKind, item: AdminColor | AdminMotif) {
  state =
    kind === "color"
      ? { ...state, colors: [...state.colors.filter((c) => c.id !== item.id), item as AdminColor].sort(byName) }
      : { ...state, motifs: [...state.motifs.filter((m) => m.id !== item.id), item as AdminMotif].sort(byName) };
  emit();
}

/** Lectura directa (para un handler que corre justo después de crear uno). */
export function getLibrary(): Library {
  return state;
}

export function useAttributeLibrary(): Library {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
  useEffect(() => {
    if (!state.loaded) void reloadLibrary();
  }, []);
  return snapshot;
}

/** Textos de cada tipo de atributo, para los componentes que sirven a los dos. */
export const KIND_TEXT = {
  color: { one: "color", many: "colores", One: "Color", Many: "Colores", new: "Crear color nuevo", edit: "Editar colores" },
  motif: { one: "motivo", many: "motivos", One: "Motivo", Many: "Motivos", new: "Crear motivo nuevo", edit: "Editar motivos" },
} as const;
