"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  AdminApiError,
  addProductImage,
  deleteProductImage,
  reorderProductImages,
  type AdminProductImage,
} from "@/lib/adminApi";
import { ADMIN_ALERT_ERROR, ADMIN_ICON_BUTTON, ADMIN_ICON_BUTTON_DANGER } from "../adminStyles";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Galería de fotos del producto: dropzone (click o drag&drop) que sube de
 * una, fila de thumbnails con reordenar/eliminar, y borrado puntual. La
 * dropzone nunca desaparece después de subir: queda lista para la próxima.
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
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato no soportado. Usá JPG, PNG o WEBP.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await addProductImage(productId, file);
      onChange([...images, res.data]);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-stretch gap-3">
        <ul className="flex flex-wrap gap-3">
          {sorted.map((img, index) => (
            <li
              key={img.id}
              className="flex w-24 flex-col items-center gap-2 rounded-md border border-admin-border bg-white p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externa (Storage), sin next/image por simplicidad. */}
              <img
                src={img.url}
                alt=""
                className="size-20 rounded-md border border-admin-border object-cover"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0 || busyId !== null}
                  title="Mover foto arriba"
                  aria-label="Mover foto arriba"
                  className={`${ADMIN_ICON_BUTTON} size-7`}
                >
                  <ArrowUp aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === sorted.length - 1 || busyId !== null}
                  title="Mover foto abajo"
                  aria-label="Mover foto abajo"
                  className={`${ADMIN_ICON_BUTTON} size-7`}
                >
                  <ArrowDown aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={busyId !== null}
                  title="Eliminar foto"
                  aria-label="Eliminar foto"
                  className={`${ADMIN_ICON_BUTTON_DANGER} size-7`}
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
          disabled={uploading}
          className="sr-only"
        />
        {/* Al lado de los thumbnails (no debajo) para que cada producto de la
            lista no coma media pantalla de alto. Siempre visible: después de
            subir una foto queda lista para la siguiente. */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file && !uploading) upload(file);
          }}
          className={`flex min-h-[124px] min-w-[220px] flex-1 flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-4 py-4 text-center transition-colors ${
            dragOver
              ? "border-black bg-admin-bg"
              : "border-admin-border bg-white hover:bg-admin-bg"
          } disabled:opacity-60`}
        >
          {uploading ? (
            <>
              <Loader2 aria-hidden="true" className="size-5 animate-spin text-admin-muted" />
              <span className="text-sm font-medium text-admin-text">Subiendo…</span>
            </>
          ) : (
            <>
              <ImagePlus aria-hidden="true" className="size-5 text-admin-muted" />
              <span className="text-sm font-medium text-admin-text">
                Arrastrá una imagen o hacé clic para elegir
              </span>
              <span className="text-[13px] text-admin-muted">
                JPG, PNG o WEBP · podés agregar varias
              </span>
            </>
          )}
        </button>
      </div>

      {error && <p role="alert" className={ADMIN_ALERT_ERROR}>{error}</p>}
    </div>
  );
}
