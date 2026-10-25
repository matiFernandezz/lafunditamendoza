"use client";

import { useEffect, useRef, useState } from "react";
import { AdminApiError, deleteProduct, type DeleteProductResult } from "@/lib/adminApi";
import AdminNotice from "../../../AdminNotice";
import { ADMIN_BUTTON_DANGER, ADMIN_BUTTON_SECONDARY, ADMIN_SECTION_TITLE, ADMIN_TEXT_MUTED } from "../../../adminStyles";

/**
 * Confirmación de "Eliminar producto". Al abrirse pregunta al servidor qué
 * pasaría (dry run): cuántas unidades se pierden y si tiene historial (en ese
 * caso queda archivado en vez de borrarse). Es un <dialog> nativo, abierto con
 * showModal() al montarse.
 */
export default function DeleteProductDialog({
  productId,
  productName,
  onClose,
  onDeleted,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
  onDeleted: (result: DeleteProductResult) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<DeleteProductResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    let ignore = false;
    deleteProduct(productId, { dryRun: true })
      .then((res) => {
        if (!ignore) setPreview(res.data);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof AdminApiError ? err.message : "No se pudo consultar el producto.");
      });
    return () => {
      ignore = true;
    };
  }, [productId]);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await deleteProduct(productId, { force: true });
      onDeleted(res.data);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo eliminar el producto.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="eliminar-producto-titulo"
      onClose={onClose}
      className="fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-[440px] rounded-lg bg-admin-surface p-6 backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 id="eliminar-producto-titulo" className={ADMIN_SECTION_TITLE}>
            Eliminar producto
          </h2>
          <p className="mt-1 break-words text-sm text-admin-muted">{productName}</p>
        </div>

        {!preview ? (
          !error && <p className={ADMIN_TEXT_MUTED}>Revisando el producto…</p>
        ) : (
          <div className="flex flex-col gap-2 text-[15px] text-admin-text">
            {preview.references > 0 ? (
              <p>
                Tiene ventas, compras o reservas, así que <strong className="font-semibold">no se borra del todo</strong>
                : sale de la tienda y del panel, pero el historial lo sigue mostrando.
              </p>
            ) : (
              <p>Se borra del todo, con sus variantes y sus fotos. No se puede deshacer.</p>
            )}
            {preview.units > 0 && (
              <p>
                Tiene <strong className="font-semibold">{preview.units === 1 ? "1 unidad" : `${preview.units} unidades`}</strong>{" "}
                en stock, que se pierden.
              </p>
            )}
            <p>¿Confirmás?</p>
          </div>
        )}

        {error && <AdminNotice kind="danger">{error}</AdminNotice>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={saving}
            className={ADMIN_BUTTON_SECONDARY}
          >
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} disabled={!preview || saving} className={ADMIN_BUTTON_DANGER}>
            {saving ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
