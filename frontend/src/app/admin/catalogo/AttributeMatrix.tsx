"use client";

import { useState } from "react";
import type { AdminIphoneModel, AdminProduct, AttributeKind } from "@/lib/adminApi";
import ColorField, { ColorDot } from "../ColorField";
import { ADMIN_TEXT_MUTED, adminInput } from "../adminStyles";
import { KIND_TEXT, getLibrary, useAttributeLibrary } from "../attributeLibrary";
import { useCells } from "./useCells";

const NO_MODEL = "__none__";
type Column = { id: string; name: string; hex?: string };

/**
 * Matriz de un producto: filas = modelos de iPhone, columnas = sus colores (o
 * motivos). Cada celda es una variante: tildada si existe y está activa.
 * Tildar la crea (stock 0) o la reactiva; destildar la da de baja, sin borrar.
 * Un color recién agregado es una columna vacía hasta que se tilda algo.
 *
 * En el celular la tabla se desplaza hacia el costado dentro de su recuadro,
 * con la columna de modelos fija.
 */
export default function AttributeMatrix({
  product,
  kind,
  models,
  onChanged,
}: {
  product: AdminProduct;
  kind: AttributeKind;
  /** Todos los modelos de iPhone, en orden. */
  models: AdminIphoneModel[];
  onChanged: () => Promise<void> | void;
}) {
  const library = useAttributeLibrary();
  const text = KIND_TEXT[kind];
  const all: Column[] = kind === "color" ? library.colors : library.motifs;
  const attrOf = (v: AdminProduct["product_variants"][number]) => (kind === "color" ? v.color_id : v.motif_id);

  // Columnas y filas agregadas en pantalla que todavía no tienen ninguna variante.
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [extraRows, setExtraRows] = useState<string[]>([]);
  const cells = useCells({ productId: product.id, kind, onChanged });

  const variants = product.product_variants;
  const activeKeys = new Set(variants.filter((v) => v.active && attrOf(v)).map((v) => `${v.iphone_model_id}|${attrOf(v)}`));
  const isOn = (modelId: string | null, attrId: string) => activeKeys.has(`${modelId}|${attrId}`);

  const columnIds = new Set([...variants.filter((v) => v.active).map(attrOf), ...extraColumns]);
  const columns = all.filter((a) => columnIds.has(a.id));

  // Filas: los modelos del producto (de todas sus variantes) y los agregados.
  const usedModelIds = new Set([...variants.map((v) => v.iphone_model_id), ...extraRows]);
  const rows: { id: string | null; name: string }[] = [
    ...models.filter((m) => usedModelIds.has(m.id)).map((m) => ({ id: m.id as string | null, name: m.name })),
    ...(usedModelIds.has(null) ? [{ id: null, name: "Sin modelo" }] : []),
  ];
  const rowIds = rows.map((r) => r.id);
  const missingModels = models.filter((m) => !usedModelIds.has(m.id));
  // Un producto universal (solo "Sin modelo") no suma modelos desde acá.
  const canAddModels = rows.length === 0 || rows.some((r) => r.id !== null);

  const hasAny = variants.some((v) => v.color_id !== null || v.motif_id !== null);

  async function addColumn(name: string) {
    const attr = getLibrary()[kind === "color" ? "colors" : "motifs"].find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    );
    if (!attr) return;
    // Producto sin ningún color/motivo: el primero va a sus variantes actuales.
    if (!hasAny && variants.length > 0 && (await cells.assignFirst(attr, rowIds))) return;
    setExtraColumns((prev) => (prev.includes(attr.id) ? prev : [...prev, attr.id]));
  }

  return (
    <div className="flex flex-col gap-2.5">
      {columns.length > 0 && rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-admin-border">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 border-b border-r border-admin-border bg-white px-3 py-2 text-left text-xs font-normal text-admin-muted"
                >
                  Modelo
                </th>
                {columns.map((attr) => {
                  const on = rowIds.filter((id) => isOn(id, attr.id)).length;
                  return (
                    <th key={attr.id} scope="col" className="border-b border-admin-border px-2 py-2 align-bottom font-normal">
                      <span className="flex min-w-[84px] flex-col items-center gap-1">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-admin-text">
                          {attr.hex && <ColorDot hex={attr.hex} size={14} />}
                          {attr.name}
                        </span>
                        <span className="flex gap-2 text-xs">
                          <button
                            type="button"
                            disabled={cells.busy || on === rows.length}
                            onClick={() => cells.set(attr, rowIds.filter((id) => !isOn(id, attr.id)), true)}
                            className="font-semibold text-admin-text underline underline-offset-2 disabled:text-admin-muted disabled:no-underline"
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            disabled={cells.busy || on === 0}
                            onClick={() => cells.set(attr, rowIds.filter((id) => isOn(id, attr.id)), false)}
                            className="font-semibold text-admin-text underline underline-offset-2 disabled:text-admin-muted disabled:no-underline"
                          >
                            Ninguno
                          </button>
                        </span>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id ?? NO_MODEL}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-admin-border bg-white px-3 py-1 text-left text-[13px] font-semibold text-admin-text"
                  >
                    {row.name}
                  </th>
                  {columns.map((attr) => {
                    const on = isOn(row.id, attr.id);
                    return (
                      <td key={attr.id} className="border-b border-admin-border p-0 text-center">
                        <label className="flex h-11 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={cells.busy}
                            onChange={() => cells.set(attr, [row.id], !on)}
                            aria-label={`${attr.name} en ${row.name}`}
                            className="size-5 cursor-pointer accent-black"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cells.panel}

      {!cells.pending && (
        <div className="grid gap-2 sm:grid-cols-2">
          <ColorField
            key={`${columns.length}-${kind}`}
            kind={kind}
            label={`Agregar ${text.one} a ${product.name}`}
            placeholder={`+ Agregar ${text.one}`}
            value=""
            takenIds={new Set(columns.map((c) => c.id))}
            allowEmpty={false}
            allowText={false}
            disabled={cells.busy}
            onChange={addColumn}
          />
          {canAddModels && missingModels.length > 0 && (
            <select
              value=""
              disabled={cells.busy}
              aria-label={`Agregar un modelo a ${product.name}`}
              onChange={(e) => setExtraRows((prev) => [...prev, e.target.value])}
              className={adminInput()}
            >
              <option value="">+ Agregar modelo</option>
              {missingModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <p className={ADMIN_TEXT_MUTED}>
        {columns.length === 0
          ? hasAny
            ? `Agregá un ${text.one} y tildá los modelos en los que viene.`
            : `Este producto todavía no tiene ${text.many}. El primero que agregues se les pone a sus variantes actuales; después destildás los modelos que no lo tengan.`
          : `Tildar crea la variante con stock 0 (o la reactiva). Destildar la da de baja, sin borrarla.`}
      </p>
    </div>
  );
}
