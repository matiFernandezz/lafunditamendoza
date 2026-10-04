"use client";

import { Check, ImagePlus, ListPlus, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminApiError,
  addProductImage,
  createProduct,
  createProductVariant,
  getAdminCategories,
  getAdminIphoneModels,
  getAdminProducts,
  type AdminCategory,
  type AdminIphoneModel,
} from "@/lib/adminApi";
import {
  MAX_PRODUCT_IMAGE_SIZE,
  MAX_PRODUCT_IMAGE_SIZE_MB,
  PRODUCT_IMAGE_TYPES,
} from "@/lib/productImages";
import AdminNotice from "../AdminNotice";
import { categoryPathById } from "../categoryPath";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_INPUT_ADORNMENT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
  adminIconButton,
  adminInput,
} from "../adminStyles";
import { suggestSku } from "./sku";

const UNIVERSAL = "__universal__";

// Una fila de la lista: un modelo (y color, si el producto viene en varios).
// savedSku: la variante ya se guardó (queda bloqueada si después falla otra).
type Row = {
  key: string;
  modelId: string;
  color: string;
  stock: string;
  price: string;
  savedSku?: string;
};

// Foto elegida pero todavía sin subir: se sube al crear el producto.
type Photo = { key: string; file: File; url: string };

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `k${keySeq}`;
}

function newRow(price = "", modelId = ""): Row {
  return { key: nextKey(), modelId, color: "", stock: "", price };
}

function isBlank(row: Row) {
  return row.modelId === "" && row.color.trim() === "" && row.stock.trim() === "";
}

function parseStock(text: string) {
  return text.trim() === "" ? 0 : Number(text);
}

async function loadData() {
  const [categories, models, products] = await Promise.all([
    getAdminCategories(),
    getAdminIphoneModels(),
    getAdminProducts(),
  ]);
  return {
    categories: categories.data,
    models: models.data,
    skus: products.data.flatMap((p) => p.product_variants.map((v) => v.sku)),
  };
}

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

export default function ProductosPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [models, setModels] = useState<AdminIphoneModel[]>([]);
  // SKUs que ya existen: los nuevos se generan sin repetir ninguno.
  const [existingSkus, setExistingSkus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // El producto ya creado en la base cuando un paso posterior (un modelo o una
  // foto) falló: "Crear" pasa a ser "Reintentar" y sigue desde donde quedó.
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; models: number; photos: number } | null>(null);

  useEffect(() => {
    let ignore = false;

    loadData()
      .then((result) => {
        if (ignore) return;
        setCategories(result.categories);
        setModels(result.models);
        setExistingSkus(result.skus);
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    loadData()
      .then((result) => {
        setCategories(result.categories);
        setModels(result.models);
        setExistingSkus(result.skus);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
      })
      .finally(() => setLoading(false));
  }

  async function refreshSkus() {
    try {
      const res = await getAdminProducts();
      setExistingSkus(res.data.flatMap((p) => p.product_variants.map((v) => v.sku)));
    } catch {
      // El próximo guardado o "Reintentar" lo refresca.
    }
  }

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
  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  function rowLabel(row: Row) {
    const model = row.modelId === UNIVERSAL ? "Sin modelo" : modelNameById.get(row.modelId) ?? "";
    return [model, row.color.trim()].filter(Boolean).join(" · ");
  }

  // SKU de cada fila: el sugerido por nombre + modelo + color, con un sufijo
  // (-2, -3…) si choca con uno que ya existe o con otra fila de la lista.
  const skuByKey = useMemo(() => {
    const taken = new Set(existingSkus);
    for (const row of rows) if (row.savedSku) taken.add(row.savedSku);

    const result = new Map<string, string>();
    for (const row of rows) {
      if (row.savedSku) {
        result.set(row.key, row.savedSku);
        continue;
      }
      if (name.trim() === "" || row.modelId === "") continue;
      const modelName = row.modelId === UNIVERSAL ? "" : modelNameById.get(row.modelId) ?? "";
      const base = suggestSku(name, modelName, row.color) || "SKU";
      let sku = base;
      for (let n = 2; taken.has(sku); n += 1) sku = `${base}-${n}`;
      taken.add(sku);
      result.set(row.key, sku);
    }
    return result;
  }, [rows, name, existingSkus, modelNameById]);

  const totalUnits = rows.reduce((sum, row) => {
    const n = parseStock(row.stock);
    return Number.isInteger(n) && n > 0 ? sum + n : sum;
  }, 0);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setFormError(null);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((row) => row.key !== key));
    setFormError(null);
  }

  function addRow() {
    setRows((prev) => [...prev, newRow(bulkPrice)]);
    setFormError(null);
  }

  // Una fila por cada modelo de iPhone que todavía no esté en la lista.
  function addAllModels() {
    setRows((prev) => {
      const kept = prev.filter((row) => !isBlank(row));
      const used = new Set(kept.map((row) => row.modelId));
      const missing = sortedModels.filter((m) => !used.has(m.id)).map((m) => newRow(bulkPrice, m.id));
      return [...kept, ...missing];
    });
    setFormError(null);
  }

  // El precio general pisa el de todas las filas sin guardar; después se puede
  // retocar el de una fila puntual.
  function applyBulkPrice(value: string) {
    setBulkPrice(value);
    setRows((prev) => prev.map((row) => (row.savedSku ? row : { ...row, price: value })));
    setFormError(null);
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const accepted: Photo[] = [];
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
    if (accepted.length > 0) setPhotos((prev) => [...prev, ...accepted]);
  }

  function removePhoto(photo: Photo) {
    URL.revokeObjectURL(photo.url);
    setPhotos((prev) => prev.filter((p) => p.key !== photo.key));
  }

  function makePrincipal(photo: Photo) {
    setPhotos((prev) => [photo, ...prev.filter((p) => p.key !== photo.key)]);
  }

  function findProblem(): string | null {
    if (name.trim() === "") return "Poné el nombre del producto.";
    if (categoryId === "") return "Elegí la categoría.";
    if (rows.length === 0) return "Agregá al menos un modelo a la lista.";

    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const where = `Fila ${index + 1}`;
      if (row.modelId === "") return `${where}: elegí el modelo.`;
      const price = Number(row.price);
      if (row.price.trim() === "" || !Number.isFinite(price) || price <= 0) {
        return `${where} (${rowLabel(row)}): el precio tiene que ser mayor a 0.`;
      }
      const stock = parseStock(row.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        return `${where} (${rowLabel(row)}): el stock tiene que ser un entero mayor o igual a 0.`;
      }
      const id = `${row.modelId}|${row.color.trim().toLowerCase()}`;
      if (seen.has(id)) return `${where} (${rowLabel(row)}): ese modelo y color ya está en la lista.`;
      seen.add(id);
    }
    return null;
  }

  function resetForm() {
    for (const photo of photos) URL.revokeObjectURL(photo.url);
    setName("");
    setDescription("");
    setBulkPrice("");
    setRows([newRow()]);
    setPhotos([]);
    setPhotoError(null);
    setCreated(null);
    setFormError(null);
  }

  async function handleSubmit() {
    if (saving) return;
    const problem = findProblem();
    if (problem) {
      setFormError(problem);
      return;
    }

    setSaving(true);
    setFormError(null);
    setDone(null);

    let product = created;
    let step = "";
    try {
      if (!product) {
        const res = await createProduct({
          category_id: categoryId,
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
        });
        product = { id: res.data.id, name: res.data.name };
        setCreated(product);
      }

      for (const row of rows) {
        if (row.savedSku) continue;
        const sku = skuByKey.get(row.key) ?? "";
        step = `el modelo ${rowLabel(row)}`;
        await createProductVariant({
          product_id: product.id,
          iphone_model_id: row.modelId === UNIVERSAL ? null : row.modelId,
          ...(row.color.trim() ? { color: row.color.trim() } : {}),
          sku,
          price: Number(row.price),
          stock_quantity: parseStock(row.stock),
        });
        setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, savedSku: sku } : r)));
      }

      for (const photo of photos) {
        step = `la foto ${photo.file.name}`;
        await addProductImage(product.id, photo.file);
        URL.revokeObjectURL(photo.url);
        setPhotos((prev) => prev.filter((p) => p.key !== photo.key));
      }

      setDone({ name: product.name, models: rows.length, photos: photos.length });
      resetForm();
      window.scrollTo({ top: 0 });
    } catch (err) {
      setFormError(
        product
          ? `El producto ya quedó creado, pero falló ${step}: ${errorMessage(err).replace(/\.?$/, ".")} Tocá "Reintentar" para cargar lo que falta.`
          : errorMessage(err),
      );
    } finally {
      setSaving(false);
      refreshSkus();
    }
  }

  if (loading) {
    return <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>;
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10">
        <AdminNotice kind="danger">{loadError}</AdminNotice>
        <button type="button" onClick={retryLoad} className={adminButton("primary")}>
          Reintentar
        </button>
      </div>
    );
  }

  const locked = created !== null;
  const ROW_GRID =
    "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_108px_140px_44px]";

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-5">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Nuevo producto</h1>
        <p className={ADMIN_PAGE_SUBTITLE}>
          Cargá el nombre, las fotos y la lista de modelos con su stock. Se crea todo junto.
        </p>
      </div>

      {done && (
        <AdminNotice kind="ok" onClose={() => setDone(null)}>
          Producto “{done.name}” creado con {done.models === 1 ? "1 modelo" : `${done.models} modelos`}
          {done.photos > 0 && (done.photos === 1 ? " y 1 foto" : ` y ${done.photos} fotos`)}.{" "}
          <Link href="/admin/catalogo" className="font-semibold underline underline-offset-2">
            Ver en Catálogo
          </Link>
        </AdminNotice>
      )}

      <section aria-labelledby="producto-datos" className={`${ADMIN_CARD} flex flex-col gap-4 lg:p-5`}>
        <h2 id="producto-datos" className={ADMIN_SECTION_TITLE}>
          Producto
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="producto-nombre" className={ADMIN_LABEL}>
              Nombre
            </label>
            <input
              id="producto-nombre"
              type="text"
              value={name}
              disabled={locked}
              onChange={(e) => {
                setName(e.target.value);
                setFormError(null);
              }}
              placeholder="Colour Case"
              className={ADMIN_INPUT}
            />
          </div>

          <div>
            <label htmlFor="producto-categoria" className={ADMIN_LABEL}>
              Categoría
            </label>
            <select
              id="producto-categoria"
              value={categoryId}
              disabled={locked}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setFormError(null);
              }}
              className={ADMIN_INPUT}
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
          <label htmlFor="producto-descripcion" className={ADMIN_LABEL}>
            Descripción en la web <span className="font-normal text-admin-muted">(opcional)</span>
          </label>
          <textarea
            id="producto-descripcion"
            value={description}
            disabled={locked}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`min-h-20 ${ADMIN_TEXTAREA}`}
          />
        </div>
      </section>

      <section aria-labelledby="producto-fotos" className={`${ADMIN_CARD} flex flex-col gap-3 lg:p-5`}>
        <h2 id="producto-fotos" className={ADMIN_SECTION_TITLE}>
          Fotos en la web{photos.length > 0 && ` (${photos.length})`}
        </h2>

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
                  disabled={saving}
                  className="absolute inset-x-1.5 bottom-1.5 flex h-7 items-center justify-center rounded bg-white/90 text-xs font-semibold text-black"
                >
                  Hacer principal
                </button>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo)}
                disabled={saving}
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
              disabled={saving}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!saving) addPhotos(e.dataTransfer.files);
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
            ? "La primera es la foto principal en la web. Se suben al crear el producto."
            : "Opcional: también podés sumarlas después desde Catálogo."}
        </p>
        {photoError && <AdminNotice kind="danger">{photoError}</AdminNotice>}
      </section>

      <section aria-labelledby="producto-modelos" className={`${ADMIN_CARD} flex flex-col gap-4 lg:p-5`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="producto-modelos" className={ADMIN_SECTION_TITLE}>
              Modelos y stock
            </h2>
            <p className={`mt-0.5 ${ADMIN_TEXT_MUTED}`}>
              {rows.length === 1 ? "1 modelo" : `${rows.length} modelos`} · {totalUnits} u. en total
            </p>
          </div>
          <div className="w-full sm:w-[220px]">
            <label htmlFor="producto-precio-general" className={ADMIN_LABEL}>
              Precio para todos los modelos
            </label>
            <div className="relative">
              <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
                $
              </span>
              <input
                id="producto-precio-general"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={bulkPrice}
                onChange={(e) => applyBulkPrice(e.target.value)}
                placeholder="0"
                className={adminInput({ prefix: "text", align: "right", mono: true })}
              />
            </div>
          </div>
        </div>

        <div>
          <div className={`hidden pb-2 text-xs text-admin-muted lg:grid ${ROW_GRID}`}>
            <span>Modelo</span>
            <span>Color (opcional)</span>
            <span className="text-right">Stock</span>
            <span className="text-right">Precio</span>
            <span />
          </div>

          <ul className="divide-y divide-admin-border border-y border-admin-border">
            {rows.map((row, index) => {
              const saved = row.savedSku !== undefined;
              const n = index + 1;
              return (
                <li key={row.key} className={`py-3 ${ROW_GRID}`}>
                  <select
                    value={row.modelId}
                    disabled={saved || saving}
                    aria-label={`Modelo, fila ${n}`}
                    onChange={(e) => updateRow(row.key, { modelId: e.target.value })}
                    className={`col-span-2 lg:col-span-1 ${ADMIN_INPUT}`}
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
                    onClick={() => removeRow(row.key)}
                    disabled={saved || saving}
                    aria-label={`Quitar fila ${n}`}
                    title="Quitar de la lista"
                    className={`mt-0.5 lg:col-start-5 lg:row-start-1 ${adminIconButton("danger")}`}
                  >
                    <Trash2 aria-hidden="true" className="size-[18px]" />
                  </button>

                  <input
                    type="text"
                    value={row.color}
                    disabled={saved || saving}
                    aria-label={`Color, fila ${n}`}
                    onChange={(e) => updateRow(row.key, { color: e.target.value })}
                    placeholder="Color (opcional)"
                    className={`col-span-3 lg:col-span-1 ${ADMIN_INPUT}`}
                  />

                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={row.stock}
                      disabled={saved || saving}
                      aria-label={`Stock, fila ${n}`}
                      onChange={(e) => updateRow(row.key, { stock: e.target.value })}
                      placeholder="0"
                      className={adminInput({ suffix: true, align: "right", mono: true })}
                    />
                    <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} right-3.5`}>
                      u.
                    </span>
                  </div>

                  <div className="relative col-span-2 lg:col-span-1">
                    <span aria-hidden="true" className={`${ADMIN_INPUT_ADORNMENT} left-3`}>
                      $
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={row.price}
                      disabled={saved || saving}
                      aria-label={`Precio, fila ${n}`}
                      onChange={(e) => updateRow(row.key, { price: e.target.value })}
                      placeholder="0"
                      className={adminInput({ prefix: "text", align: "right", mono: true })}
                    />
                  </div>

                  {(saved || skuByKey.has(row.key)) && (
                    <p className="col-span-full flex flex-wrap items-center gap-2 font-mono text-xs text-admin-muted">
                      SKU {skuByKey.get(row.key)}
                      {saved && (
                        <span className={adminBadge("ok")}>
                          <Check aria-hidden="true" className="mr-1 size-3" />
                          Guardado
                        </span>
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
          <button type="button" onClick={addRow} disabled={saving} className={adminButton("secondary")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            Agregar modelo
          </button>
          <button type="button" onClick={addAllModels} disabled={saving} className={adminButton("secondary")}>
            <ListPlus aria-hidden="true" className="size-[18px]" />
            Agregar todos los modelos
          </button>
        </div>
      </section>

      {formError && <AdminNotice kind="danger">{formError}</AdminNotice>}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className={`${adminButton("primary", "lg")} w-full`}
        >
          {saving ? "Guardando…" : locked ? "Reintentar lo que falta" : "Crear producto"}
        </button>
        {locked && !saving && (
          <button type="button" onClick={resetForm} className={`${adminButton("ghost")} w-full`}>
            Dejarlo así y cargar otro producto
          </button>
        )}
      </div>
    </div>
  );
}
