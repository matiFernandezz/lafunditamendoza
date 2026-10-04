"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import AdminNotice from "../AdminNotice";
import { ADMIN_PAGE_SUBTITLE, ADMIN_PAGE_TITLE, ADMIN_TEXT_MUTED, adminButton } from "../adminStyles";
import ProductDraftForm from "./ProductDraftForm";
import { UNIVERSAL, assignSkus, emptyDraft, releasePhotos, rowLabel, type ProductDraft } from "./productDraft";

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

  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft());

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

  const modelNameById = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models]);

  const skuByKey = useMemo(
    () => assignSkus(draft.name, draft.rows, new Set(existingSkus), modelNameById),
    [draft.name, draft.rows, existingSkus, modelNameById],
  );

  function findProblem(): string | null {
    if (draft.name.trim() === "") return "Poné el nombre del producto.";
    if (draft.categoryId === "") return "Elegí la categoría.";
    if (draft.rows.length === 0) return "Agregá al menos un modelo a la lista.";

    const seen = new Set<string>();
    for (const [index, row] of draft.rows.entries()) {
      const where = `Fila ${index + 1}`;
      if (row.modelId === "") return `${where}: elegí el modelo.`;
      const label = rowLabel(row, modelNameById);
      const price = Number(row.price);
      if (row.price.trim() === "" || !Number.isFinite(price) || price <= 0) {
        return `${where} (${label}): el precio tiene que ser mayor a 0.`;
      }
      const stock = parseStock(row.quantity);
      if (!Number.isInteger(stock) || stock < 0) {
        return `${where} (${label}): el stock tiene que ser un entero mayor o igual a 0.`;
      }
      const id = `${row.modelId}|${row.color.trim().toLowerCase()}`;
      if (seen.has(id)) return `${where} (${label}): ese modelo con esa descripción ya está en la lista.`;
      seen.add(id);
    }
    return null;
  }

  function resetForm() {
    releasePhotos(draft.photos);
    // La categoría se conserva: lo habitual es cargar varios productos del mismo tipo.
    setDraft(emptyDraft("", draft.categoryId));
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
          category_id: draft.categoryId,
          name: draft.name.trim(),
          ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        });
        product = { id: res.data.id, name: res.data.name };
        setCreated(product);
      }

      for (const row of draft.rows) {
        if (row.savedSku) continue;
        const sku = skuByKey.get(row.key) ?? "";
        step = `el modelo ${rowLabel(row, modelNameById)}`;
        await createProductVariant({
          product_id: product.id,
          iphone_model_id: row.modelId === UNIVERSAL ? null : row.modelId,
          ...(row.color.trim() ? { color: row.color.trim() } : {}),
          sku,
          price: Number(row.price),
          stock_quantity: parseStock(row.quantity),
        });
        setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.key === row.key ? { ...r, savedSku: sku } : r)) }));
      }

      for (const photo of draft.photos) {
        step = `la foto ${photo.file.name}`;
        await addProductImage(product.id, photo.file);
        URL.revokeObjectURL(photo.url);
        setDraft((d) => ({ ...d, photos: d.photos.filter((p) => p.key !== photo.key) }));
      }

      setDone({ name: product.name, models: draft.rows.length, photos: draft.photos.length });
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

      <ProductDraftForm
        idPrefix="producto"
        draft={draft}
        onChange={(update) => {
          setDraft(update);
          setFormError(null);
        }}
        categories={categories}
        models={models}
        skuByKey={skuByKey}
        disabled={saving}
        locked={locked}
      />

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
