"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AdminApiError,
  colorToMotif,
  deleteColor,
  deleteMotif,
  mergeColor,
  mergeMotif,
  updateColor,
  updateMotif,
  type AttributeKind,
} from "@/lib/adminApi";
import AdminNotice from "./AdminNotice";
import {
  ADMIN_INSET,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminIconButton,
  adminInput,
} from "./adminStyles";
import { KIND_TEXT, LIBRARY_TOUCHED_PRODUCTS, reloadLibrary, useAttributeLibrary } from "./attributeLibrary";

type Draft = { name?: string; hex?: string };
type Item = { id: string; name: string; variant_count: number; hex?: string; assigned?: boolean };

const COLOR_INPUT = "h-12 w-12 shrink-0 cursor-pointer rounded-md border border-admin-border-strong bg-white p-1";

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Modal "Editar colores" / "Editar motivos": cambiar nombre (y tono), unir dos
 * en uno, y eliminar de a uno los que no usa ninguna variante (marcados "Sin
 * uso"). Un color que en realidad es un dibujo o personaje se puede "Pasar a
 * motivo". Los cambios de nombre y tono se guardan todos juntos; unir,
 * eliminar y pasar a motivo se aplican al confirmar.
 */
export default function AttributeManager({ kind, onClose }: { kind: AttributeKind; onClose: () => void }) {
  const library = useAttributeLibrary();
  const text = KIND_TEXT[kind];
  const items: Item[] = kind === "color" ? library.colors : library.motifs;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [merging, setMerging] = useState<{ id: string; into: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    void reloadLibrary();
  }, []);

  function setDraft(id: string, patch: Draft) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setError(null);
    setNotice(null);
  }

  const changes = items.flatMap((item) => {
    const draft = drafts[item.id];
    if (!draft) return [];
    const patch: Draft = {};
    if (draft.name !== undefined && draft.name.trim() !== item.name) patch.name = draft.name.trim();
    if (kind === "color" && draft.hex !== undefined && draft.hex.toLowerCase() !== item.hex) {
      patch.hex = draft.hex.toLowerCase();
    }
    return Object.keys(patch).length > 0 ? [{ id: item.id, patch }] : [];
  });
  const hasEmptyName = changes.some((c) => c.patch.name === "");

  /** Lo que se hizo tocó variantes o fotos: se recarga todo lo que las muestra. */
  async function refresh(touchedProducts: boolean) {
    await reloadLibrary();
    if (touchedProducts) window.dispatchEvent(new Event(LIBRARY_TOUCHED_PRODUCTS));
  }

  async function run(action: () => Promise<string>, touchedProducts: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setNotice(await action());
      await refresh(touchedProducts);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    if (changes.length === 0 || hasEmptyName) return;
    void run(async () => {
      const results = await Promise.allSettled(
        changes.map((c) =>
          kind === "color" ? updateColor(c.id, c.patch) : updateMotif(c.id, c.patch.name as string),
        ),
      );
      const saved = changes.filter((_, i) => results[i].status === "fulfilled").map((c) => c.id);
      setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !saved.includes(id))));
      const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failed) throw failed.reason;
      return saved.length === 1 ? "Cambio guardado." : `${saved.length} cambios guardados.`;
    }, true);
  }

  function handleMerge(item: Item) {
    const target = items.find((i) => i.id === merging?.into);
    if (!target) return;
    void run(async () => {
      const { data } = await (kind === "color" ? mergeColor(item.id, target.id) : mergeMotif(item.id, target.id));
      setMerging(null);
      return `“${data.from}” se unió con “${data.into}”: ${data.variants === 1 ? "1 variante" : `${data.variants} variantes`} y ${data.images === 1 ? "1 foto" : `${data.images} fotos`}.`;
    }, true);
  }

  function handleDelete(item: Item, keepText: boolean) {
    const question = keepText
      ? `¿Sacar “${item.name}” de la lista de ${text.many}?\n\nSus ${item.variant_count} variantes conservan “${item.name}” como descripción libre.`
      : `¿Eliminar “${item.name}”? No lo usa ninguna variante.`;
    if (!window.confirm(question)) return;
    void run(async () => {
      await (kind === "color" ? deleteColor(item.id, keepText) : deleteMotif(item.id, keepText));
      return keepText ? `“${item.name}” ya no es un ${text.one}.` : `“${item.name}” eliminado.`;
    }, keepText);
  }

  /** Pregunta al servidor cuánto movería, pide confirmar y recién ahí lo hace. */
  async function handleToMotif(item: Item) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { data: preview } = await colorToMotif(item.id, true);
      const count = `${preview.variants === 1 ? "1 variante" : `${preview.variants} variantes`} de ${
        preview.products === 1 ? "1 producto" : `${preview.products} productos`
      }`;
      const photos = preview.images > 0 ? ` y ${preview.images === 1 ? "1 foto" : `${preview.images} fotos`}` : "";
      const ok = window.confirm(
        `¿Pasar “${item.name}” a motivo?\n\n${count}${photos} dejan de tener ese color y pasan al motivo “${item.name}”${
          preview.motif_existed ? ", que ya existe" : ", que se crea"
        }. Conservan stock (${preview.units} u.), precio y SKU.\n\nEl color queda en la lista, sin uso.`,
      );
      if (!ok) return;
      const { data } = await colorToMotif(item.id);
      setNotice(
        `“${data.name}” pasó a motivo: ${data.variants === 1 ? "1 variante" : `${data.variants} variantes`}. El color quedó sin uso.`,
      );
      await refresh(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const term = fold(search.trim());
  const visible = term === "" ? items : items.filter((i) => fold(i.name).includes(term));

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="editar-atributos"
      className="fixed inset-0 m-auto flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[640px] flex-col overflow-hidden rounded-lg bg-white p-0 backdrop:bg-black/45"
    >
      <div className="flex items-center justify-between gap-3 border-b border-admin-border py-3 pl-5 pr-2.5">
        <h2 id="editar-atributos" className={ADMIN_SECTION_TITLE}>
          {text.edit}
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Cerrar"
          className={adminIconButton("plain")}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 lg:p-5">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-admin-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${text.one}`}
            aria-label={`Buscar ${text.one}`}
            className={adminInput({ prefix: "icon" })}
          />
        </div>

        {notice && (
          <AdminNotice kind="ok" onClose={() => setNotice(null)}>
            {notice}
          </AdminNotice>
        )}
        {error && <AdminNotice kind="danger">{error}</AdminNotice>}

        {visible.length === 0 ? (
          <p className={ADMIN_TEXT_MUTED}>
            {items.length === 0 ? `Todavía no hay ${text.many}.` : `Ningún ${text.one} con ese nombre.`}
          </p>
        ) : (
          <ul className="divide-y divide-admin-border border-y border-admin-border">
            {visible.map((item) => {
              const draft = drafts[item.id] ?? {};
              const name = draft.name ?? item.name;
              const dirty = changes.some((c) => c.id === item.id);
              const isMerging = merging?.id === item.id;
              return (
                <li key={item.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center gap-2">
                    {kind === "color" && (
                      <input
                        type="color"
                        value={draft.hex ?? item.hex ?? "#9ca3af"}
                        disabled={busy}
                        aria-label={`Tono de ${item.name}`}
                        onChange={(e) => setDraft(item.id, { hex: e.target.value })}
                        className={COLOR_INPUT}
                      />
                    )}
                    <input
                      type="text"
                      value={name}
                      disabled={busy}
                      aria-label={`Nombre de ${item.name}`}
                      onChange={(e) => setDraft(item.id, { name: e.target.value })}
                      className={adminInput({ state: name.trim() === "" ? "error" : dirty ? "dirty" : null })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      {kind === "color" && item.assigned === false && draft.hex === undefined && (
                        <span className={adminBadge("warn")}>Sin color asignado</span>
                      )}
                      {item.variant_count === 0 ? (
                        <span className={adminBadge("neutral")}>Sin uso</span>
                      ) : (
                        <span className={ADMIN_TEXT_MUTED}>
                          {item.variant_count === 1 ? "1 variante" : `${item.variant_count} variantes`}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMerging(isMerging ? null : { id: item.id, into: "" })}
                          disabled={busy}
                          className={adminButton("ghost", "sm")}
                        >
                          Unir con…
                        </button>
                      )}
                      {kind === "color" && item.variant_count > 0 && (
                        <button
                          type="button"
                          onClick={() => handleToMotif(item)}
                          disabled={busy}
                          className={adminButton("ghost", "sm")}
                        >
                          Pasar a motivo
                        </button>
                      )}
                      {item.variant_count === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(item, false)}
                          disabled={busy}
                          className={`${adminButton("ghost", "sm")} text-admin-danger`}
                        >
                          Eliminar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(item, true)}
                          disabled={busy}
                          className={adminButton("ghost", "sm")}
                        >
                          No es un {text.one}
                        </button>
                      )}
                    </span>
                  </div>

                  {isMerging && (
                    <div className={`${ADMIN_INSET} flex flex-col gap-2`}>
                      <label htmlFor={`unir-${item.id}`} className="text-sm font-semibold text-admin-text">
                        Pasar todas las variantes y fotos de “{item.name}” a:
                      </label>
                      <select
                        id={`unir-${item.id}`}
                        value={merging.into}
                        disabled={busy}
                        onChange={(e) => setMerging({ id: item.id, into: e.target.value })}
                        className={adminInput()}
                      >
                        <option value="">Elegí el {text.one} que queda</option>
                        {items
                          .filter((other) => other.id !== item.id)
                          .map((other) => (
                            <option key={other.id} value={other.id}>
                              {other.name}
                            </option>
                          ))}
                      </select>
                      <p className={ADMIN_TEXT_MUTED}>
                        “{item.name}” se borra. Si un producto ya tenía los dos para el mismo modelo, queda una sola
                        variante con el stock sumado.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMerging(null)}
                          disabled={busy}
                          className={adminButton("secondary", "sm")}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMerge(item)}
                          disabled={busy || merging.into === ""}
                          className={adminButton("primary", "sm")}
                        >
                          {busy ? "Uniendo…" : "Unir"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {changes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-admin-border p-3 lg:px-5">
          <p className={`text-sm font-medium ${hasEmptyName ? "text-admin-danger" : "text-admin-text"}`}>
            {hasEmptyName
              ? "El nombre no puede quedar vacío."
              : changes.length === 1
                ? "1 cambio sin guardar"
                : `${changes.length} cambios sin guardar`}
          </p>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
            <button type="button" onClick={() => setDrafts({})} disabled={busy} className={adminButton("secondary")}>
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || hasEmptyName}
              className={adminButton("primary")}
            >
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
