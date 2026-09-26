"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminApiError, uploadProductImage } from "@/lib/adminApi";

/** Preview + subida de la foto del producto. Guardado explícito (botón), no automático al elegir el archivo. */
export default function ProductImageField({
  productId,
  imageUrl,
  onUploaded,
}: {
  productId: string;
  imageUrl: string | null;
  onUploaded: (newImageUrl: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const previewUrl = objectUrl ?? imageUrl;

  async function handleSave() {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const res = await uploadProductImage(productId, file);
      onUploaded(res.data.image_url ?? "");
      setFile(null);
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa (Storage), sin next/image por simplicidad.
        <img
          src={previewUrl}
          alt=""
          className={`h-14 w-14 shrink-0 rounded-xl border object-cover transition-colors ${
            flash ? "border-emerald-600" : "border-rule"
          }`}
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-rule text-center text-xs text-graphite">
          Sin foto
        </div>
      )}

      <div className="flex flex-col gap-1">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
          disabled={saving}
          className="max-w-48 text-sm disabled:opacity-60"
        />
        {file && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 w-fit rounded-lg bg-ink px-3 text-sm font-semibold text-paper disabled:opacity-40"
          >
            {saving ? "Subiendo…" : "Guardar imagen"}
          </button>
        )}
        {error && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
