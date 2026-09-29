"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  AdminApiError,
  addProductImage,
  deleteProductImage,
  reorderProductImages,
  type AdminProductImage,
} from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import { ADMIN_TEXT_MUTED, adminButton } from "../adminStyles";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Galería de fotos del producto, como en el diseño: fila de miniaturas (la
 * primera es la principal) y al final el recuadro para subir (click o
 * arrastrar, de a una). Tocar una miniatura la selecciona y muestra
 * Antes / Después / Quitar.
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      setSelectedId(null);
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

  const selectedIndex = sorted.findIndex((img) => img.id === selectedId);

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="-m-1 flex gap-2 overflow-x-auto p-1 lg:flex-wrap lg:overflow-visible">
        {sorted.map((img, index) => {
          const selected = img.id === selectedId;
          return (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(selected ? null : img.id)}
                aria-pressed={selected}
                aria-label={`Foto ${index + 1}${index === 0 ? ", principal" : ""}`}
                className={`relative block size-24 overflow-hidden rounded bg-admin-border outline-offset-2 lg:size-28 ${
                  selected ? "outline-[3px] outline-admin-ink" : "outline-none"
                } ${busyId === img.id ? "opacity-40" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa (Storage), sin next/image por simplicidad. */}
                <img src={img.url} alt="" className="size-full object-cover" />
                <span
                  className={`absolute left-1.5 top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 font-mono text-xs font-bold ${
                    index === 0 ? "bg-admin-ink text-white" : "bg-white/90 text-black"
                  }`}
                >
                  {index === 0 ? "Principal" : index + 1}
                </span>
              </button>
            </li>
          );
        })}

        <li className="shrink-0">
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
          {/* Siempre visible: después de subir una foto queda lista para la siguiente. */}
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
            className={`flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded border-2 border-dashed p-2 text-center text-admin-text transition-colors duration-200 disabled:opacity-60 lg:h-28 lg:w-[220px] ${
              dragOver ? "border-admin-ink bg-admin-bg" : "border-admin-border-strong bg-white hover:bg-admin-bg"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 aria-hidden="true" className="size-6 animate-spin text-admin-muted" />
                <span className="text-[13px] font-semibold leading-tight">Subiendo…</span>
              </>
            ) : (
              <>
                <ImagePlus aria-hidden="true" className="size-6" />
                <span className="text-[13px] font-semibold leading-tight lg:hidden">Agregar foto</span>
                <span className="hidden text-[13px] font-semibold leading-tight lg:block">
                  Arrastrá una foto o hacé clic
                </span>
                <span className="hidden text-xs text-admin-muted lg:block">JPG, PNG o WEBP</span>
              </>
            )}
          </button>
        </li>
      </ul>

      {selectedIndex >= 0 ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleMove(selectedIndex, -1)}
            disabled={selectedIndex === 0 || busyId !== null}
            className={adminButton("secondary")}
          >
            <ArrowLeft aria-hidden="true" className="size-[18px]" />
            Antes
          </button>
          <button
            type="button"
            onClick={() => handleMove(selectedIndex, 1)}
            disabled={selectedIndex === sorted.length - 1 || busyId !== null}
            className={adminButton("secondary")}
          >
            <ArrowRight aria-hidden="true" className="size-[18px]" />
            Después
          </button>
          <button
            type="button"
            onClick={() => handleDelete(sorted[selectedIndex].id)}
            disabled={busyId !== null}
            className={adminButton("dangerOutline")}
          >
            <Trash2 aria-hidden="true" className="size-[18px]" />
            Quitar
          </button>
        </div>
      ) : (
        <p className={ADMIN_TEXT_MUTED}>
          {sorted.length > 0
            ? "La primera es la foto principal en la web. Tocá una foto para moverla o quitarla."
            : "Sin fotos: en la web se ve el recuadro vacío."}
        </p>
      )}

      {error && <AdminNotice kind="danger">{error}</AdminNotice>}
    </div>
  );
}
