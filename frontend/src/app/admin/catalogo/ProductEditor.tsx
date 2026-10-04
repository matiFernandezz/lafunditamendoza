"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import type { AdminColor, AdminProduct, AdminProductImage, AdminVariant } from "@/lib/adminApi";
import { colorsWithoutPhotos } from "@/lib/productColors";
import { ColorDot } from "../ColorField";
import AdminNotice from "../AdminNotice";
import { MoneyInput, UnitsInput } from "../GridInputs";
import {
  ADMIN_CAP,
  ADMIN_EMPTY,
  ADMIN_TEXTAREA,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminChip,
  adminInput,
} from "../adminStyles";
import { displayColor } from "../ventas/utils";
import ProductImageGallery from "./ProductImageGallery";
import { draftChanges, type CatalogDraft } from "./catalogDraft";

const MAX_DESCRIPTION = 1000;

/**
 * Panel de un producto en Catálogo. Nombre, descripción, stock y precios se
 * editan libremente y se guardan todos juntos con el botón de abajo, que
 * aparece cuando hay algún cambio. Las fotos se guardan al subirlas.
 */
export default function ProductEditor({
  product,
  variants,
  draft,
  onDraftChange,
  modelNameById,
  colors,
  saving,
  error,
  justSaved,
  onSave,
  onDiscard,
  onImagesChange,
  onAddVariant,
}: {
  product: AdminProduct;
  /** Las variantes que pasan los filtros de la pantalla. */
  variants: AdminVariant[];
  draft: CatalogDraft;
  onDraftChange: (update: (draft: CatalogDraft) => CatalogDraft) => void;
  modelNameById: Map<string, string>;
  colors: AdminColor[];
  saving: boolean;
  error: string | null;
  justSaved: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onImagesChange: (images: AdminProductImage[]) => void;
  onAddVariant: () => void;
}) {
  const [bulkPrice, setBulkPrice] = useState("");
  // Qué fotos se están viendo: null = las generales, o las de un color.
  const [photoColorId, setPhotoColorId] = useState<string | null>(null);
  const all = product.product_variants;
  const changes = draftChanges(product, draft);
  const hidden = all.length - variants.length;

  // Colores que tiene el producto (por sus variantes), en el orden de la lista.
  const usedColorIds = new Set(all.map((v) => v.color_id));
  const productColors = colors.filter((c) => usedColorIds.has(c.id));
  const missingPhotos = new Set(colorsWithoutPhotos(all, product.product_images));
  // Si el color elegido dejó de ser del producto, se vuelve a las generales.
  const activePhotoColorId = productColors.some((c) => c.id === photoColorId) ? photoColorId : null;
  const photoCount = (colorId: string | null) => product.product_images.filter((img) => img.color_id === colorId).length;

  const name = draft.name ?? product.name;
  const description = draft.description ?? product.description ?? "";

  // "Precio para todos" pisa el precio de todas las variantes del producto,
  // también las que el filtro no está mostrando. Se guarda con el resto.
  function applyBulkPrice(value: string) {
    setBulkPrice(value);
    if (value.trim() === "") return;
    onDraftChange((d) => ({ ...d, price: { ...d.price, ...Object.fromEntries(all.map((v) => [v.id, value])) } }));
  }

  return (
    <div className="border-t border-admin-border">
      <div className="grid items-start gap-6 p-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8 lg:p-6">
        <div className="flex min-w-0 flex-col gap-6">
          <EditorSection title="Nombre">
            <input
              type="text"
              value={name}
              disabled={saving}
              aria-label="Nombre del producto"
              aria-invalid={changes.invalid.has("name") || undefined}
              onChange={(e) => onDraftChange((d) => ({ ...d, name: e.target.value }))}
              className={adminInput({
                state: changes.invalid.has("name") ? "error" : changes.productPatch.name !== undefined ? "dirty" : null,
              })}
            />
          </EditorSection>

          <EditorSection title="Descripción en la web">
            <textarea
              value={description}
              disabled={saving}
              rows={4}
              maxLength={MAX_DESCRIPTION}
              aria-label="Descripción del producto"
              placeholder="Ej.: funda de silicona suave, con protección de cámara. Se ve en la ficha del producto."
              onChange={(e) => onDraftChange((d) => ({ ...d, description: e.target.value }))}
              className={`${ADMIN_TEXTAREA} min-h-28 ${
                changes.productPatch.description !== undefined ? "border-admin-ink" : ""
              }`}
            />
            <span className={ADMIN_TEXT_MUTED}>
              {description.length}/{MAX_DESCRIPTION}
            </span>
          </EditorSection>

          <EditorSection title={`Fotos en la web (${product.product_images.length})`}>
            {productColors.length > 0 && (
              <div role="radiogroup" aria-label="Fotos de" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {[null, ...productColors].map((color) => {
                  const id = color?.id ?? null;
                  return (
                    <button
                      key={id ?? "general"}
                      type="button"
                      role="radio"
                      aria-checked={activePhotoColorId === id}
                      onClick={() => setPhotoColorId(id)}
                      className={`${adminChip(activePhotoColorId === id)} flex items-center gap-2`}
                    >
                      {color && <ColorDot hex={color.hex} size={16} />}
                      {color?.name ?? "General"}
                      <span className="font-mono text-xs opacity-70">{photoCount(id)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <ProductImageGallery
              productId={product.id}
              images={product.product_images}
              colorId={activePhotoColorId}
              onChange={onImagesChange}
            />
            {missingPhotos.size > 0 && (
              <p className={ADMIN_TEXT_MUTED}>
                Sin fotos propias:{" "}
                {productColors
                  .filter((c) => missingPhotos.has(c.id))
                  .map((c) => c.name)
                  .join(", ")}
                . Al elegir esos colores, la tienda muestra las fotos generales.
              </p>
            )}
          </EditorSection>

          {all.length > 0 && (
            <EditorSection title="Precio para todos los modelos">
              <MoneyInput
                className="sm:max-w-[240px]"
                label={`Precio para todos los modelos de ${product.name}`}
                value={bulkPrice}
                disabled={saving}
                onChange={applyBulkPrice}
              />
              <p className={ADMIN_TEXT_MUTED}>
                Lo copia a {all.length === 1 ? "la variante" : `las ${all.length} variantes`}
                {hidden > 0 && ` (también las ${hidden} que el filtro no muestra)`}. Se guarda con el botón de abajo.
              </p>
            </EditorSection>
          )}
        </div>

        <EditorSection title={`Variantes (${variants.length}${hidden > 0 ? ` de ${all.length}` : ""})`}>
          {all.length === 0 ? (
            <p className={ADMIN_EMPTY}>Todavía no tiene variantes. Agregale la primera.</p>
          ) : (
            <div className="hidden grid-cols-[minmax(0,1fr)_108px_140px] gap-2 text-xs text-admin-muted lg:grid">
              <span>Modelo · color · SKU</span>
              <span className="text-right">Stock</span>
              <span className="text-right">Precio</span>
            </div>
          )}
          <ul className="divide-y divide-admin-border">
            {variants.map((v) => {
              const modelName = v.iphone_model_id ? modelNameById.get(v.iphone_model_id) : "Sin modelo";
              const detail = [modelName, displayColor(v.color)].filter(Boolean).join(" · ");
              const stockText = draft.stock[v.id] ?? String(v.stock_quantity);
              const priceText = draft.price[v.id] ?? String(v.price);
              const patch = changes.variants.find((p) => p.id === v.id);
              return (
                <li
                  key={v.id}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-start gap-2 py-3 first:pt-0 lg:grid-cols-[minmax(0,1fr)_108px_140px]"
                >
                  <div className="col-span-2 min-w-0 lg:col-span-1 lg:self-center">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-admin-text">{detail}</span>
                      {v.stock_quantity === 0 && <span className={adminBadge("danger")}>Sin stock</span>}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-admin-muted">{v.sku}</span>
                  </div>
                  <UnitsInput
                    label={`Stock ${detail}`}
                    value={stockText}
                    disabled={saving}
                    invalid={changes.invalid.has(`${v.id}:stock`)}
                    dirty={patch?.stock_quantity !== undefined}
                    onChange={(value) => onDraftChange((d) => ({ ...d, stock: { ...d.stock, [v.id]: value } }))}
                  />
                  <MoneyInput
                    label={`Precio ${detail}`}
                    value={priceText}
                    disabled={saving}
                    invalid={changes.invalid.has(`${v.id}:price`)}
                    dirty={patch?.price !== undefined}
                    onChange={(value) => onDraftChange((d) => ({ ...d, price: { ...d.price, [v.id]: value } }))}
                  />
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={onAddVariant} className={`${adminButton("secondary")} w-full`}>
            <Plus aria-hidden="true" className="size-[18px]" />
            Agregar variante
          </button>
        </EditorSection>
      </div>

      {/* Un solo Guardar para todo el producto. Queda pegado abajo de la
          pantalla mientras haya cambios, así no hay que ir a buscarlo. */}
      {(changes.dirty || error) && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-admin-border bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-6px_16px_rgb(0_0_0/0.06)] lg:px-6">
          {error && <AdminNotice kind="danger">{error}</AdminNotice>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-sm font-medium ${changes.invalid.size > 0 ? "text-admin-danger" : "text-admin-text"}`}
            >
              {changes.invalid.size > 0
                ? "Revisá los campos en rojo: el nombre no puede quedar vacío, el stock es un entero y el precio mayor a 0."
                : changes.count === 1
                  ? "1 cambio sin guardar"
                  : `${changes.count} cambios sin guardar`}
            </p>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
              <button type="button" onClick={onDiscard} disabled={saving} className={adminButton("secondary")}>
                Descartar
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || changes.invalid.size > 0 || changes.count === 0}
                className={adminButton("primary")}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
      {justSaved && !changes.dirty && (
        <p
          role="status"
          className="flex items-center gap-1.5 border-t border-admin-border px-4 py-3 text-sm font-semibold text-admin-ok lg:px-6"
        >
          <Check aria-hidden="true" className="size-4" />
          Cambios guardados
        </p>
      )}
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <h3 className={ADMIN_CAP}>{title}</h3>
      {children}
    </section>
  );
}
