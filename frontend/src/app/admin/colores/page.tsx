"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  createColor,
  deleteColor,
  getColors,
  updateColor,
  type AdminColor,
} from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import {
  ADMIN_CARD,
  ADMIN_EMPTY,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminInput,
} from "../adminStyles";

const NEW_HEX = "#9ca3af";
const COLOR_INPUT = "h-12 w-12 shrink-0 cursor-pointer rounded-md border border-admin-border-strong bg-white p-1";

type Draft = { name?: string; hex?: string };

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/**
 * Lista de colores de la tienda: nombre y color (hex) de cada uno. Los "sin
 * color asignado" son los que se crearon a partir de un texto que no estaba
 * en la lista de nombres conocidos: tienen un gris por defecto.
 */
export default function ColoresPage() {
  const [colors, setColors] = useState<AdminColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cambios sin guardar por color; se guardan todos juntos.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState(NEW_HEX);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getColors()
      .then((res) => {
        if (ignore) return;
        setColors(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los colores.");
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  function setDraft(id: string, patch: Draft) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setError(null);
    setNotice(null);
  }

  // Solo lo que realmente difiere de lo guardado.
  const changes = colors.flatMap((color) => {
    const draft = drafts[color.id];
    if (!draft) return [];
    const patch: Draft = {};
    if (draft.name !== undefined && draft.name.trim() !== color.name) patch.name = draft.name.trim();
    if (draft.hex !== undefined && draft.hex.toLowerCase() !== color.hex) patch.hex = draft.hex.toLowerCase();
    return Object.keys(patch).length > 0 ? [{ id: color.id, patch }] : [];
  });
  const hasEmptyName = changes.some((c) => c.patch.name === "");

  async function handleSave() {
    if (saving || changes.length === 0 || hasEmptyName) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    const results = await Promise.allSettled(changes.map((c) => updateColor(c.id, c.patch)));
    const failures: unknown[] = [];
    const saved = new Map<string, Omit<AdminColor, "variant_count">>();
    results.forEach((result, index) => {
      if (result.status === "fulfilled") saved.set(changes[index].id, result.value.data);
      else failures.push(result.reason);
    });

    setColors((prev) => prev.map((c) => (saved.has(c.id) ? { ...c, ...saved.get(c.id) } : c)));
    setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !saved.has(id))));

    if (failures.length > 0) {
      setError(
        `${failures.length === 1 ? "No se pudo guardar 1 color" : `No se pudieron guardar ${failures.length} colores`}: ${errorMessage(failures[0])}`,
      );
    } else {
      setNotice(saved.size === 1 ? "Color guardado." : `${saved.size} colores guardados.`);
    }
    setSaving(false);
  }

  async function handleCreate() {
    const name = newName.trim();
    if (name === "" || creating) return;
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await createColor({ name, hex: newHex });
      setColors((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setNewName("");
      setNewHex(NEW_HEX);
      setNotice(`Color “${res.data.name}” agregado.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleNotAColor(color: AdminColor) {
    const uses =
      color.variant_count === 0
        ? "No lo usa ninguna variante."
        : `${color.variant_count === 1 ? "1 variante lo usa: conserva" : `${color.variant_count} variantes lo usan: conservan`} “${color.name}” como descripción.`;
    if (!window.confirm(`¿Sacar “${color.name}” de la lista de colores?\n\n${uses}`)) return;
    setBusyId(color.id);
    setError(null);
    setNotice(null);
    try {
      await deleteColor(color.id);
      setColors((prev) => prev.filter((c) => c.id !== color.id));
      setNotice(`“${color.name}” ya no es un color.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>;
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10">
        <AdminNotice kind="danger">{loadError}</AdminNotice>
      </div>
    );
  }

  const unassigned = colors.filter((c) => !c.assigned).length;

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Colores</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          {colors.length === 1 ? "1 color" : `${colors.length} colores`}
          {unassigned > 0 && ` · ${unassigned} sin color asignado`}. Son los círculos que ve el cliente en la tienda.
        </p>
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}

      <section aria-labelledby="color-nuevo" className={`${ADMIN_CARD} flex flex-col gap-3 lg:p-5`}>
        <h2 id="color-nuevo" className={ADMIN_SECTION_TITLE}>
          Color nuevo
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="color-nuevo-hex" className={ADMIN_LABEL}>
              Color
            </label>
            <input
              id="color-nuevo-hex"
              type="color"
              value={newHex}
              onChange={(e) => setNewHex(e.target.value)}
              className={COLOR_INPUT}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label htmlFor="color-nuevo-nombre" className={ADMIN_LABEL}>
              Nombre
            </label>
            <input
              id="color-nuevo-nombre"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              placeholder="Verde menta"
              className={adminInput()}
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || newName.trim() === ""}
            className={adminButton("primary")}
          >
            <Plus aria-hidden="true" className="size-[18px]" />
            {creating ? "Agregando…" : "Agregar"}
          </button>
        </div>
      </section>

      {colors.length === 0 ? (
        <p className={ADMIN_EMPTY}>Todavía no hay colores.</p>
      ) : (
        <ul className="divide-y divide-admin-border overflow-clip rounded-md border border-admin-border bg-white">
          {colors.map((color) => {
            const draft = drafts[color.id] ?? {};
            const name = draft.name ?? color.name;
            const hex = draft.hex ?? color.hex;
            const dirty = changes.some((c) => c.id === color.id);
            return (
              <li key={color.id} className="flex flex-wrap items-center gap-2 p-3 lg:px-4">
                <input
                  type="color"
                  value={hex}
                  disabled={saving}
                  aria-label={`Color de ${color.name}`}
                  onChange={(e) => setDraft(color.id, { hex: e.target.value })}
                  className={COLOR_INPUT}
                />
                <input
                  type="text"
                  value={name}
                  disabled={saving}
                  aria-label={`Nombre de ${color.name}`}
                  onChange={(e) => setDraft(color.id, { name: e.target.value })}
                  className={`${adminInput({ state: name.trim() === "" ? "error" : dirty ? "dirty" : null })} min-w-[150px] flex-1`}
                />
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2 sm:flex-none">
                  <span className="flex flex-wrap items-center gap-2">
                    {!color.assigned && draft.hex === undefined && (
                      <span className={adminBadge("warn")}>Sin color asignado</span>
                    )}
                    <span className={ADMIN_TEXT_MUTED}>
                      {color.variant_count === 1 ? "1 variante" : `${color.variant_count} variantes`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNotAColor(color)}
                    disabled={saving || busyId === color.id}
                    className={adminButton("ghost", "sm")}
                  >
                    No es un color
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Un solo Guardar para todos los colores tocados, pegado abajo. */}
      {(changes.length > 0 || error) && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-md border border-admin-border bg-white p-3 shadow-[0_-6px_16px_rgb(0_0_0/0.06)]">
          {error && <AdminNotice kind="danger">{error}</AdminNotice>}
          {changes.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-sm font-medium ${hasEmptyName ? "text-admin-danger" : "text-admin-text"}`}>
                {hasEmptyName
                  ? "Un color no puede quedar sin nombre."
                  : changes.length === 1
                    ? "1 color con cambios sin guardar"
                    : `${changes.length} colores con cambios sin guardar`}
              </p>
              <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
                <button
                  type="button"
                  onClick={() => setDrafts({})}
                  disabled={saving}
                  className={adminButton("secondary")}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || hasEmptyName}
                  className={adminButton("primary")}
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
