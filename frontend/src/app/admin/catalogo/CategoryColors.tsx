"use client";

import { useState } from "react";
import {
  AdminApiError,
  addColorToCategory,
  removeColorFromCategory,
  type AddColorToCategoryResult,
  type AdminColor,
  type AdminIphoneModel,
  type RemoveColorFromCategoryResult,
} from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import ColorField from "../ColorField";
import {
  ADMIN_BODY,
  ADMIN_CARD,
  ADMIN_INSET,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminSegment,
} from "../adminStyles";
import { getLibrary } from "../attributeLibrary";

type Action = "add" | "remove";
type Preview =
  | { action: "add"; color: AdminColor; data: AddColorToCategoryResult }
  | { action: "remove"; color: AdminColor; data: RemoveColorFromCategoryResult };

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/**
 * Agregar o quitar un color en todos los productos de una categoría (y de sus
 * tipos), en los modelos elegidos (todos por defecto). Al elegir el color se
 * le pregunta al servidor qué pasaría: cuántos productos y variantes cambian
 * y cuáles se omiten. Recién después se confirma.
 * No se muestra en Accesorios (lo decide la página).
 */
export default function CategoryColors({
  category,
  models,
  onChanged,
}: {
  category: { id: string; name: string };
  /** Todos los modelos de iPhone, en orden. */
  models: AdminIphoneModel[];
  onChanged: (message: string) => void;
}) {
  const [action, setAction] = useState<Action>("add");
  const [colorName, setColorName] = useState("");
  // Modelos destildados: vacío = todos.
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = models.filter((m) => !excluded.has(m.id));
  // null = todos (así entran también las variantes sin modelo).
  const modelIds = (set: Set<string>) =>
    set.size === 0 ? null : models.filter((m) => !set.has(m.id)).map((m) => m.id);

  async function load(nextAction: Action, name: string, nextExcluded = excluded) {
    setAction(nextAction);
    setColorName(name);
    setExcluded(nextExcluded);
    setPreview(null);
    setError(null);
    const color = getLibrary().colors.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!color || nextExcluded.size === models.length) return;
    setBusy(true);
    try {
      if (nextAction === "add") {
        const res = await addColorToCategory(category.id, color.id, true, modelIds(nextExcluded));
        setPreview({ action: "add", color, data: res.data });
      } else {
        const res = await removeColorFromCategory(category.id, color.id, true, modelIds(nextExcluded));
        setPreview({ action: "remove", color, data: res.data });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleModel(id: string) {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    void load(action, colorName, next);
  }

  async function confirm() {
    if (!preview || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (preview.action === "add") {
        const { data } = await addColorToCategory(category.id, preview.color.id, false, modelIds(excluded));
        onChanged(
          `Se agregó ${preview.color.name} a ${plural(data.products, "producto", "productos")} de ${category.name}: ${plural(data.created, "variante nueva", "variantes nuevas")}${data.reactivated > 0 ? ` y ${plural(data.reactivated, "reactivada", "reactivadas")}` : ""}.`,
        );
      } else {
        const { data } = await removeColorFromCategory(category.id, preview.color.id, false, modelIds(excluded));
        onChanged(
          `Se quitó ${preview.color.name} de ${plural(data.products, "producto", "productos")} de ${category.name}: ${plural(data.deactivated, "variante dada de baja", "variantes dadas de baja")}${data.omitted.length > 0 ? `. Se omitieron ${plural(data.omitted.length, "variante", "variantes")} con stock` : ""}.`,
        );
      }
      setPreview(null);
      setColorName("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const nothing =
    preview !== null &&
    (preview.action === "add"
      ? preview.data.created + preview.data.reactivated === 0
      : preview.data.deactivated === 0);

  return (
    <section aria-labelledby="colores-categoria" className={`${ADMIN_CARD} flex flex-col gap-3 lg:p-5`}>
      <div>
        <h2 id="colores-categoria" className={ADMIN_SECTION_TITLE}>
          Colores de {category.name}
        </h2>
        <p className={`mt-0.5 ${ADMIN_TEXT_MUTED}`}>
          Agregar o quitar un color en todos los productos de la categoría de una vez, en los modelos que elijas.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div role="radiogroup" aria-label="Acción" className="grid grid-cols-2 gap-2">
          {(
            [
              ["add", "Agregar color"],
              ["remove", "Quitar color"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={action === value}
              disabled={busy}
              onClick={() => load(value, colorName)}
              className={adminSegment(action === value)}
            >
              {text}
            </button>
          ))}
        </div>
        <ColorField
          label={`Color para ${action === "add" ? "agregar a" : "quitar de"} ${category.name}`}
          placeholder="Elegí el color"
          value={colorName}
          allowEmpty={false}
          allowText={false}
          disabled={busy}
          onChange={(name) => load(action, name)}
        />
      </div>

      <details className="text-sm text-admin-text">
        <summary className="cursor-pointer font-semibold">
          Modelos: {excluded.size === 0 ? `todos (${models.length})` : `${chosen.length} de ${models.length}`}
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex gap-3 text-[13px]">
            <button
              type="button"
              disabled={busy || excluded.size === 0}
              onClick={() => load(action, colorName, new Set())}
              className="font-semibold underline underline-offset-2 disabled:text-admin-muted disabled:no-underline"
            >
              Todos
            </button>
            <button
              type="button"
              disabled={busy || excluded.size === models.length}
              onClick={() => load(action, colorName, new Set(models.map((m) => m.id)))}
              className="font-semibold underline underline-offset-2 disabled:text-admin-muted disabled:no-underline"
            >
              Ninguno
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
            {models.map((m) => (
              <li key={m.id}>
                <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={!excluded.has(m.id)}
                    disabled={busy}
                    onChange={() => toggleModel(m.id)}
                    className="size-[18px] shrink-0 accent-black"
                  />
                  {m.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </details>

      {excluded.size === models.length && <p className={ADMIN_TEXT_MUTED}>Elegí al menos un modelo.</p>}
      {busy && !preview && <p className={ADMIN_TEXT_MUTED}>Calculando…</p>}

      {preview && (
        <div className={`${ADMIN_INSET} flex flex-col gap-3`}>
          {preview.action === "add" ? (
            <>
              <p className={ADMIN_BODY}>
                {nothing ? (
                  <>Ningún producto necesita {preview.color.name} en esos modelos.</>
                ) : (
                  <>
                    Se {preview.data.created === 1 ? "va a crear" : "van a crear"}{" "}
                    <strong className="font-semibold">{plural(preview.data.created, "variante", "variantes")}</strong> de{" "}
                    {preview.color.name} con stock 0 en{" "}
                    <strong className="font-semibold">{plural(preview.data.products, "producto", "productos")}</strong>
                    {preview.data.reactivated > 0 &&
                      `, y se ${preview.data.reactivated === 1 ? "reactiva 1 dada" : `reactivan ${preview.data.reactivated} dadas`} de baja`}
                    .
                  </>
                )}
              </p>
              {preview.data.changed.length > 0 && (
                <Details summary={`Ver ${plural(preview.data.changed.length, "producto", "productos")}`}>
                  {preview.data.changed.map((p) => (
                    <li key={p.product_id}>
                      {p.product_name}: {plural(p.created + p.reactivated, "variante", "variantes")}
                    </li>
                  ))}
                </Details>
              )}
              {preview.data.skipped.length > 0 && (
                <Details
                  summary={`Se ${preview.data.skipped.length === 1 ? "omite" : "omiten"} ${plural(preview.data.skipped.length, "producto", "productos")}`}
                >
                  {preview.data.skipped.map((p) => (
                    <li key={p.product_id}>
                      {p.product_name} ({p.reason})
                    </li>
                  ))}
                </Details>
              )}
            </>
          ) : (
            <>
              <p className={ADMIN_BODY}>
                {nothing ? (
                  <>No hay variantes de {preview.color.name} sin stock para dar de baja en esos modelos.</>
                ) : (
                  <>
                    Se {preview.data.deactivated === 1 ? "va a dar" : "van a dar"} de baja{" "}
                    <strong className="font-semibold">{plural(preview.data.deactivated, "variante", "variantes")}</strong> de{" "}
                    {preview.color.name} en{" "}
                    <strong className="font-semibold">{plural(preview.data.products, "producto", "productos")}</strong>. No
                    se borran.
                  </>
                )}
              </p>
              {preview.data.omitted.length > 0 && (
                <Details
                  summary={`Se ${preview.data.omitted.length === 1 ? "omite" : "omiten"} ${plural(preview.data.omitted.length, "variante", "variantes")} con stock (${preview.data.omitted_units} u.)`}
                >
                  {preview.data.omitted.map((v) => (
                    <li key={v.sku}>
                      {v.product_name} · {v.model ?? "Sin modelo"} · {v.stock} u.
                    </li>
                  ))}
                  <li className="list-none pt-1">Para esas, destildá el color desde cada producto.</li>
                </Details>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setColorName("");
              }}
              disabled={busy}
              className={adminButton("secondary")}
            >
              {nothing ? "Cerrar" : "Cancelar"}
            </button>
            {!nothing && (
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className={adminButton(preview.action === "remove" ? "danger" : "primary")}
              >
                {busy ? "Aplicando…" : preview.action === "add" ? "Agregar a todos" : "Dar de baja"}
              </button>
            )}
          </div>
        </div>
      )}

      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
    </section>
  );
}

function Details({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="text-sm text-admin-text">
      <summary className="cursor-pointer font-semibold">{summary}</summary>
      <ul className="mt-1.5 list-disc pl-5 text-admin-muted">{children}</ul>
    </details>
  );
}
