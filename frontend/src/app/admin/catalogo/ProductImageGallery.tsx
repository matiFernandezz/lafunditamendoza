"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  addProductImage,
  deleteProductImage,
  reorderProductImages,
  type AdminProductImage,
} from "@/lib/adminApi";

/**
 * Galería de fotos del producto: thumbnails en orden, agregar (con guardado
 * explícito), borrar puntual y reordenar con flechas ↑↓ (acción inmediata,
 * sin paso de confirmación aparte: mover es una acción de un solo paso).
 */
export default function ProductImageGallery({
  productId,
  images,
  onChange,
}: {
  productId: string;
  images: AdminProductImage[];
  onChange: (images: AdminProductImage[]) => void;
}) {
  const sorted = useMemo(() => [...images].sort((a, b) => a.sort_order - b.sort_order), [images]);

  const [file, setFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  async function handleAdd() {
    if (!file) return;
    setAdding(true);
    setError(null);
    try {
      const res = await addProductImage(productId, file);
      onChange([...images, res.data]);
      setFile(null);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo subir la imagen.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(imageId: string) {
    setBusyId(imageId);
    setError(null);
    try {
      await deleteProductImage(productId, imageId);
      onChange(images.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo borrar la imagen.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const order = reordered.map((img) => img.id);

    setBusyId(sorted[index].id);
    setError(null);
    try {
      const res = await reorderProductImages(productId, order);
      onChange(res.data);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo reordenar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {sorted.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {sorted.map((img, index) => (
            <li key={img.id} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externa (Storage), sin next/image por simplicidad. */}
              <img
                src={img.url}
                alt=""
                className="h-16 w-16 rounded-xl border border-rule object-cover"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0 || busyId !== null}
                  aria-label="Mover antes"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-graphite text-xs disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === sorted.length - 1 || busyId !== null}
                  aria-label="Mover después"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-graphite text-xs disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={busyId !== null}
                  aria-label="Borrar imagen"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-graphite text-xs disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
          disabled={adding}
          className="max-w-48 text-sm disabled:opacity-60"
        />
        {file && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="h-9 shrink-0 rounded-lg bg-ink px-3 text-sm font-semibold text-paper disabled:opacity-40"
          >
            {adding ? "Subiendo…" : "Agregar imagen"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
