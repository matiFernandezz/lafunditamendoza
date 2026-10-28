"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRef } from "react";
import { MAX_PRODUCT_IMAGE_SIZE, MAX_PRODUCT_IMAGE_SIZE_MB, PRODUCT_IMAGE_TYPES } from "@/lib/productImages";
import { adminButton, adminIconButton } from "../adminStyles";

/** Flechas para subir o bajar un elemento de una lista. */
export function ReorderButtons({
  index,
  total,
  disabled,
  onMove,
  label,
}: {
  index: number;
  total: number;
  disabled?: boolean;
  onMove: (delta: -1 | 1) => void;
  label: string;
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={disabled || index === 0}
        aria-label={`Subir ${label}`}
        title="Subir"
        className={adminIconButton("outline", "sm")}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={disabled || index === total - 1}
        aria-label={`Bajar ${label}`}
        title="Bajar"
        className={adminIconButton("outline", "sm")}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

/** Medida recomendada de una foto de la tienda (la mínima para que se vea nítida). */
export type PhotoSize = { width: number; height: number; label: string };

export const PHOTO_SIZES = {
  heroDesktop: { width: 1600, height: 730, label: "Computadora: horizontal, 1920 × 875 px (mínimo 1600 × 730)" },
  heroMobile: { width: 900, height: 1125, label: "Celular: vertical, 1080 × 1350 px (mínimo 900 × 1125)" },
  story: { width: 720, height: 1280, label: "Vertical como una historia, 1080 × 1920 px (mínimo 720 × 1280)" },
  tile: { width: 800, height: 1000, label: "Vertical, 1000 × 1250 px (mínimo 800 × 1000)" },
  cutout: { width: 400, height: 800, label: "La funda de frente, con fondo liso, 1200 px de alto (mínimo 800)" },
} satisfies Record<string, PhotoSize>;

/** Texto de ayuda con la medida recomendada. */
export function SizeHint({ size }: { size: PhotoSize }) {
  return <p className="text-[13px] text-admin-muted">Recomendado: {size.label}. JPG, PNG o WEBP, hasta 10MB.</p>;
}

/** Mide la foto en el navegador; null si no se puede leer. */
async function measure(file: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

/** Aviso si la foto es más chica que lo recomendado (no la bloquea). */
export async function smallPhotoWarning(file: Blob, size: PhotoSize): Promise<string | null> {
  const actual = await measure(file);
  if (!actual || (actual.width >= size.width && actual.height >= size.height)) return null;
  return `La foto mide ${actual.width} × ${actual.height} px: es más chica que lo recomendado (${size.width} × ${size.height}), así que puede verse poco nítida.`;
}

/**
 * Botón que abre el selector de archivos, valida tipo y tamaño y devuelve la
 * foto. Con `recommended`, avisa (sin bloquear) si es más chica de lo ideal.
 */
export function PickPhotoButton({
  children,
  onPick,
  onError,
  onWarn,
  recommended,
  disabled,
  kind = "secondary",
}: {
  children: React.ReactNode;
  onPick: (file: File) => void;
  onError: (message: string) => void;
  onWarn?: (message: string) => void;
  recommended?: PhotoSize;
  disabled?: boolean;
  kind?: "primary" | "secondary";
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} disabled={disabled} className={adminButton(kind, "sm")}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={PRODUCT_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!PRODUCT_IMAGE_TYPES.includes(file.type)) return onError("La foto tiene que ser JPG, PNG o WEBP.");
          if (file.size > MAX_PRODUCT_IMAGE_SIZE) return onError(`La foto no puede superar ${MAX_PRODUCT_IMAGE_SIZE_MB}MB.`);
          if (recommended && onWarn) {
            void smallPhotoWarning(file, recommended).then((warning) => {
              if (warning) onWarn(warning);
            });
          }
          onPick(file);
        }}
      />
    </>
  );
}

/** Mueve un elemento de la lista y devuelve la lista nueva. */
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + delta, 0, item);
  return next;
}
