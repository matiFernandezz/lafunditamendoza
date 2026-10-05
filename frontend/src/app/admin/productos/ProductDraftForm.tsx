"use client";

import { Check, ImagePlus, ListPlus, Plus, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { AdminCategory, AdminIphoneModel } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import {
  MAX_PRODUCT_IMAGE_SIZE,
  MAX_PRODUCT_IMAGE_SIZE_MB,
  PRODUCT_IMAGE_TYPES,
} from "@/lib/productImages";
import AdminNotice from "../AdminNotice";
import ColorField from "../ColorField";
import { MoneyInput, UnitsInput } from "../GridInputs";
import { categoryPathById } from "../categoryPath";
import {
  ADMIN_CARD,
  ADMIN_LABEL,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminIconButton,
  adminInput,
} from "../adminStyles";
import { effectiveCost, parseMoney, parseQuantity, unitGain } from "../compras/purchaseLogic";
import {
  UNIVERSAL,
  isBlankRow,
  newDraftRow,
  nextKey,
  type DraftPhoto,
  type DraftRow,
  type ProductDraft,
} from "./productDraft";

const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_108px_140px_44px]";
// En una compra hay tres números por fila (cantidad, costo, precio): van
// siempre en una segunda línea, así entran a 390px sin scroll horizontal.
const PURCHASE_ROW_GRID = "grid grid-cols-6 gap-2";

/**
 * Formulario de un producto nuevo: nombre, categoría, descripción, fotos y la
 * lista de modelos. Controlado: el estado (`draft`) lo guarda quien lo usa.
 *
 * - "Nuevo producto": lista con stock inicial y precio.
 * - `purchase`: dentro de una compra. La cantidad es lo que se compra y se
 *   suman el costo unitario, "Costo para todos" y la ganancia por unidad.
 */
export default function ProductDraftForm({
  draft,
  onChange,
  categories,
  models,
  skuByKey,
  idPrefix,
  disabled = false,
  locked = false,
  purchase = false,
  invalid,
  fieldKey = "",
}: {
  draft: ProductDraft;
  onChange: (update: (draft: ProductDraft) => ProductDraft) => void;
  categories: AdminCategory[];
  models: AdminIphoneModel[];
  skuByKey: Map<string, string>;
  idPrefix: string;
  /** Guardando: nada se puede editar. */
  disabled?: boolean;
  /** El producto ya se creó: nombre, categoría y descripción quedan fijos. */
  locked?: boolean;
  purchase?: boolean;
  /** Campos a marcar en rojo (ver validatePurchase). */
  invalid?: Set<string>;
  /** Prefijo de los campos del producto en `invalid` (la key del bloque). */
  fieldKey?: string;
}) {
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categorías con jerarquía. Solo se pueden elegir las hojas: el catálogo público
  // muestra productos de subcategorías, no de una categoría que tiene hijas.
  const categoryOptions = useMemo(() => {
    const parents = categories
      .filter((c) => c.parent_id === null)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return parents.map((parent) => ({
      parent,
      children: categories
        .filter((c) => c.parent_id === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    }));
  }, [categories]);
  const categoryPath = useMemo(() => categoryPathById(categories), [categories]);
  const sortedModels = useMemo(() => [...models].sort((a, b) => a.sort_order - b.sort_order), [models]);

  const isInvalid = (field: string) => invalid?.has(field) ?? false;
  const set = (patch: Partial<ProductDraft>) => onChange((d) => ({ ...d, ...patch }));
  const setRows = (update: (rows: DraftRow[]) => DraftRow[]) => onChange((d) => ({ ...d, rows: update(d.rows) }));
  const updateRow = (key: string, patch: Partial<DraftRow>) =>
    setRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  // Una fila por cada modelo de iPhone que todavía no esté en la lista.
  function addAllModels() {
    onChange((d) => {
      const kept = d.rows.filter((row) => !isBlankRow(row));
      const used = new Set(kept.map((row) => row.modelId));
      const missing = sortedModels.filter((m) => !used.has(m.id)).map((m) => newDraftRow(d.bulkPrice, m.id));
      return { ...d, rows: [...kept, ...missing] };
    });
  }

  // El precio general pisa el de todas las filas sin guardar; después se puede
  // retocar el de una fila puntual.
  function applyBulkPrice(value: string) {
    onChange((d) => ({
      ...d,
      bulkPrice: value,
      rows: d.rows.map((row) => (row.savedSku ? row : { ...row, price: value })),
    }));
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const accepted: DraftPhoto[] = [];
    let problem: string | null = null;
    for (const file of Array.from(files)) {
      if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
        problem = "Formato no soportado. Usá JPG, PNG o WEBP.";
      } else if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
        problem = `La imagen no puede superar ${MAX_PRODUCT_IMAGE_SIZE_MB}MB`;
      } else {
        accepted.push({ key: nextKey(), file, url: URL.createObjectURL(file) });
      }
    }
    setPhotoError(problem);
    if (accepted.length > 0) onChange((d) => ({ ...d, photos: [...d.photos, ...accepted] }));
  }

  function removePhoto(photo: DraftPhoto) {
    URL.revokeObjectURL(photo.url);
    onChange((d) => ({ ...d, photos: d.photos.filter((p) => p.key !== photo.key) }));
  }

  function makePrincipal(photo: DraftPhoto) {
    onChange((d) => ({ ...d, photos: [photo, ...d.photos.filter((p) => p.key !== photo.key)] }));
  }

  const { rows, photos } = draft;
  const totalUnits = rows.reduce((sum, row) => sum + (parseQuantity(row.quantity) ?? 0), 0);
  // Suelto es una tarjeta por sección; en una compra va todo dentro del bloque.
  const section = purchase ? "flex flex-col gap-3" : `${ADMIN_CARD} flex flex-col gap-4 lg:p-5`;
  const heading = purchase ? "text-sm font-semibold text-admin-text" : ADMIN_SECTION_TITLE;

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby={`${idPrefix}-datos`} className={section}>
        <h3 id={`${idPrefix}-datos`} className={purchase ? "sr-only" : heading}>
          Producto
        </h3>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-nombre`} className={ADMIN_LABEL}>
              Nombre
            </label>
            <input
              id={`${idPrefix}-nombre`}
              type="text"
              value={draft.name}
              disabled={locked || disabled}
              aria-invalid={isInvalid(`${fieldKey}:name`) || undefined}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Colour Case"
              className={adminInput({ state: isInvalid(`${fieldKey}:name`) ? "error" : null })}
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-categoria`} className={ADMIN_LABEL}>
              Categoría
            </label>
            <select
              id={`${idPrefix}-categoria`}
              value={draft.categoryId}
              disabled={locked || disabled}
              aria-invalid={isInvalid(`${fieldKey}:category`) || undefined}
              onChange={(e) => set({ categoryId: e.target.value })}
              className={adminInput({ state: isInvalid(`${fieldKey}:category`) ? "error" : null })}
            >
              <option value="">Elegí una categoría</option>
              {categoryOptions.map(({ parent, children }) =>
                children.length > 0 ? (
                  <optgroup key={parent.id} label={parent.name}>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {categoryPath(child.id)}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-descripcion`} className={ADMIN_LABEL}>
            Descripción en la web <span className="font-normal text-admin-muted">(opcional)</span>
          </label>
          <textarea
            id={`${idPrefix}-descripcion`}
            value={draft.description}
            disabled={locked || disabled}
            onChange={(e) => set({ description: e.target.value })}
            rows={2}
            className={`min-h-20 ${ADMIN_TEXTAREA}`}
          />
        </div>
      </section>

      <section aria-labelledby={`${idPrefix}-fotos`} className={section}>
        <h3 id={`${idPrefix}-fotos`} className={heading}>
          Fotos en la web{photos.length > 0 ? ` (${photos.length})` : purchase ? " (opcional)" : ""}
        </h3>

        <ul className="-m-1 flex gap-2 overflow-x-auto p-1 lg:flex-wrap lg:overflow-visible">
          {photos.map((photo, index) => (
            <li key={photo.key} className="relative size-24 shrink-0 overflow-hidden rounded bg-admin-border lg:size-28">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), todavía sin subir. */}
              <img src={photo.url} alt={`Foto ${index + 1}`} className="size-full object-cover" />
              {index === 0 ? (
                <span className="absolute left-1.5 top-1.5 flex h-[22px] items-center rounded-full bg-admin-ink px-1.5 font-mono text-xs font-bold text-white">
                  Principal
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makePrincipal(photo)}
                  disabled={disabled}
                  className="absolute inset-x-1.5 bottom-1.5 flex h-7 items-center justify-center rounded bg-white/90 text-xs font-semibold text-black"
                >
                  Hacer principal
                </button>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo)}
                disabled={disabled}
                aria-label={`Quitar foto ${index + 1}`}
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-white/90 text-black"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}

          <li className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={PRODUCT_IMAGE_TYPES.join(",")}
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = "";
              }}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!disabled) addPhotos(e.dataTransfer.files);
              }}
              className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded border-2 border-dashed border-admin-border-strong bg-white p-2 text-center text-admin-text transition-colors duration-200 hover:bg-admin-bg disabled:opacity-60 lg:h-28 lg:w-[220px]"
            >
              <ImagePlus aria-hidden="true" className="size-6" />
              <span className="text-[13px] font-semibold leading-tight lg:hidden">Agregar fotos</span>
              <span className="hidden text-[13px] font-semibold leading-tight lg:block">
                Arrastrá fotos o hacé clic
              </span>
              <span className="hidden text-xs text-admin-muted lg:block">JPG, PNG o WEBP</span>
            </button>
          </li>
        </ul>

        <p className={ADMIN_TEXT_MUTED}>
          {photos.length > 0
            ? `La primera es la foto principal en la web. Se suben al ${purchase ? "registrar la compra" : "crear el producto"}.`
            : "Opcional: también podés sumarlas después desde Catálogo."}
        </p>
        {photoError && <AdminNotice kind="danger">{photoError}</AdminNotice>}
      </section>

      <section aria-labelledby={`${idPrefix}-modelos`} className={section}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id={`${idPrefix}-modelos`} className={heading}>
              {purchase ? "Modelos que entran" : "Modelos y stock"}
            </h3>
            <p className={`mt-0.5 ${ADMIN_TEXT_MUTED}`}>
              {rows.length === 1 ? "1 modelo" : `${rows.length} modelos`} · {totalUnits} u. en total
            </p>
          </div>
          <div className={`grid w-full gap-2 ${purchase ? "grid-cols-2 sm:w-[380px]" : "sm:w-[220px]"}`}>
            {purchase && (
              <MoneyInput
                id={`${idPrefix}-costo-general`}
                caption="Costo para todos"
                label="Costo para todos los modelos"
                value={draft.bulkCost}
                disabled={disabled}
                invalid={isInvalid(`${fieldKey}:bulkCost`)}
                onChange={(value) => set({ bulkCost: value })}
              />
            )}
            <MoneyInput
              id={`${idPrefix}-precio-general`}
              caption={purchase ? "Precio de venta para todos" : "Precio para todos los modelos"}
              label="Precio para todos los modelos"
              value={draft.bulkPrice}
              disabled={disabled}
              onChange={applyBulkPrice}
            />
          </div>
        </div>

        <div>
          {!purchase && (
            <div className={`hidden pb-2 text-xs text-admin-muted lg:grid ${ROW_GRID}`}>
              <span>Modelo</span>
              <span>Color (opcional)</span>
              <span className="text-right">Stock</span>
              <span className="text-right">Precio</span>
              <span />
            </div>
          )}

          <ul className="divide-y divide-admin-border border-y border-admin-border">
            {rows.map((row, index) => {
              const saved = row.savedSku !== undefined;
              const off = saved || disabled;
              const n = index + 1;
              const cost = parseMoney(effectiveCost(row, draft.bulkCost));
              const price = parseMoney(row.price);
              const gain = purchase && cost !== null && price !== null ? unitGain(price, cost) : null;

              return (
                <li key={row.key} className={`py-3 ${purchase ? PURCHASE_ROW_GRID : ROW_GRID}`}>
                  <select
                    value={row.modelId}
                    disabled={off}
                    aria-label={`Modelo, fila ${n}`}
                    aria-invalid={isInvalid(`${row.key}:model`) || undefined}
                    onChange={(e) => updateRow(row.key, { modelId: e.target.value })}
                    className={`${purchase ? "col-span-5 md:col-span-3" : "col-span-2 lg:col-span-1"} ${adminInput({
                      state: isInvalid(`${row.key}:model`) ? "error" : null,
                    })}`}
                  >
                    <option value="">Elegí el modelo</option>
                    {sortedModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                    <option value={UNIVERSAL}>Sin modelo (sirve para todos)</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    disabled={off}
                    aria-label={`Quitar fila ${n}`}
                    title="Quitar de la lista"
                    className={`mt-0.5 ${
                      purchase ? "justify-self-end md:col-start-6 md:row-start-1" : "lg:col-start-5 lg:row-start-1"
                    } ${adminIconButton("danger")}`}
                  >
                    <Trash2 aria-hidden="true" className="size-[18px]" />
                  </button>

                  <ColorField
                    label={`Color, fila ${n}`}
                    value={row.color}
                    disabled={off}
                    onChange={(value) => updateRow(row.key, { color: value })}
                    className={purchase ? "col-span-6 md:col-span-2" : "col-span-3 lg:col-span-1"}
                  />

                  <UnitsInput
                    className={purchase ? "col-span-2" : ""}
                    caption={purchase ? "Cantidad" : undefined}
                    label={`${purchase ? "Cantidad" : "Stock"}, fila ${n}`}
                    value={row.quantity}
                    disabled={off}
                    invalid={isInvalid(`${row.key}:quantity`)}
                    purchaseNav={purchase}
                    onChange={(value) => updateRow(row.key, { quantity: value })}
                  />

                  {purchase && (
                    <MoneyInput
                      className="col-span-2"
                      caption="Costo unit."
                      label={`Costo unitario, fila ${n}`}
                      value={effectiveCost(row, draft.bulkCost)}
                      disabled={off}
                      invalid={isInvalid(`${row.key}:cost`)}
                      onChange={(value) => updateRow(row.key, { cost: value, costTouched: true })}
                    />
                  )}

                  <MoneyInput
                    className={purchase ? "col-span-2" : "col-span-2 lg:col-span-1"}
                    caption={purchase ? "Precio venta" : undefined}
                    label={`Precio de venta, fila ${n}`}
                    value={row.price}
                    disabled={off}
                    invalid={isInvalid(`${row.key}:price`)}
                    onChange={(value) => updateRow(row.key, { price: value })}
                  />

                  {(saved || skuByKey.has(row.key) || gain || row.costTouched) && (
                    <p className="col-span-full flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-admin-muted">
                      {skuByKey.has(row.key) && <span className="font-mono">SKU {skuByKey.get(row.key)}</span>}
                      {saved && (
                        <span className={adminBadge("ok")}>
                          <Check aria-hidden="true" className="mr-1 size-3" />
                          Guardado
                        </span>
                      )}
                      {gain && (
                        <span className={gain.amount < 0 ? "font-semibold text-admin-danger" : ""}>
                          Ganás {formatPrice(gain.amount)} por unidad ({Math.round(gain.percent)}% sobre el costo)
                        </span>
                      )}
                      {purchase && row.costTouched && !off && (
                        <button
                          type="button"
                          onClick={() => updateRow(row.key, { cost: "", costTouched: false })}
                          className="font-semibold text-admin-text underline underline-offset-2"
                        >
                          Usar el costo para todos
                        </button>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {rows.length === 0 && (
            <p className={`pt-3 ${ADMIN_TEXT_MUTED}`}>La lista está vacía. Agregá al menos un modelo.</p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange((d) => ({ ...d, rows: [...d.rows, newDraftRow(d.bulkPrice)] }))}
            disabled={disabled}
            className={adminButton("secondary")}
          >
            <Plus aria-hidden="true" className="size-[18px]" />
            Agregar modelo
          </button>
          <button type="button" onClick={addAllModels} disabled={disabled} className={adminButton("secondary")}>
            <ListPlus aria-hidden="true" className="size-[18px]" />
            Agregar todos los modelos
          </button>
        </div>
      </section>
    </div>
  );
}
