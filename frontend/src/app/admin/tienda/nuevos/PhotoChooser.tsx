"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminProduct } from "@/lib/adminApi";
import { makeCutout, type Cutout } from "@/lib/cutout";
import { formatPriceRange } from "@/lib/format";
import AdminNotice from "../../AdminNotice";
import { ADMIN_LABEL, ADMIN_SECTION_TITLE, ADMIN_TEXT_MUTED, adminButton, adminIconButton, adminInput } from "../../adminStyles";
import { PHOTO_SIZES, PickPhotoButton, SizeHint, smallPhotoWarning } from "../storeUi";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Ventana para elegir la funda (si no viene fija) y la foto. Al elegir una
 * foto se recorta en el navegador (fondo liso → transparente) y se muestra
 * cómo queda, con el color del canto calculado y editable. "Usar esta foto"
 * devuelve el recorte; quien la abre lo sube y lo guarda.
 */
export default function PhotoChooser({
  products,
  fixedProductId,
  title,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  /** Las fundas que se pueden elegir (las más nuevas primero). */
  products: AdminProduct[];
  /** Cambiar la foto de una que ya está: la funda viene fija. */
  fixedProductId?: string;
  title: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (productId: string, cutout: Cutout, edgeColor: string) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [productId, setProductId] = useState(fixedProductId ?? "");
  const [search, setSearch] = useState("");
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [edgeColor, setEdgeColor] = useState("#121212");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La funda recortada es más chica que lo recomendado: se avisa, no se bloquea.
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // El recorte anterior se libera al cambiarlo o al cerrar.
  useEffect(() => () => {
    if (cutout) URL.revokeObjectURL(cutout.previewUrl);
  }, [cutout]);

  const product = products.find((p) => p.id === productId);
  const options = useMemo(() => {
    const term = fold(search.trim());
    return products.filter((p) => term === "" || fold(p.name).includes(term)).slice(0, 12);
  }, [products, search]);

  async function choose(source: string | Blob) {
    setWorking(true);
    setError(null);
    try {
      const result = await makeCutout(source);
      setCutout(result);
      setEdgeColor(result.edgeColor);
      setWarning(await smallPhotoWarning(result.blob, PHOTO_SIZES.cutout));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo recortar la foto.");
    } finally {
      setWorking(false);
    }
  }

  async function confirm() {
    if (!product || !cutout) return;
    setWorking(true);
    setError(null);
    try {
      await onConfirm(product.id, cutout, edgeColor);
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      setWorking(false);
    }
  }

  const photos = product ? [...product.product_images].sort((a, b) => a.sort_order - b.sort_order) : [];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="elegir-foto"
      className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[640px] overflow-y-auto rounded-lg bg-admin-surface p-0 backdrop:bg-black/45"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="elegir-foto" className={ADMIN_SECTION_TITLE}>
            {title}
            {product && ` · ${product.name}`}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar"
            className={`-mr-2 -mt-2 ${adminIconButton("plain")}`}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {!product ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="nuevo-buscar" className={ADMIN_LABEL}>
              Funda
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-admin-muted"
              />
              <input
                id="nuevo-buscar"
                type="search"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar funda…"
                className={adminInput({ prefix: "icon" })}
              />
            </div>
            <ul className="divide-y divide-admin-border overflow-hidden rounded-md border border-admin-border">
              {options.length === 0 ? (
                <li className={`px-3.5 py-2.5 ${ADMIN_TEXT_MUTED}`}>Ninguna funda con ese nombre.</li>
              ) : (
                options.map((p) => {
                  const thumb = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setProductId(p.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-admin-bg"
                      >
                        <span className="size-10 shrink-0 overflow-hidden rounded bg-admin-bg">
                          {thumb && (
                            // eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage.
                            <img src={thumb} alt="" className="size-full object-cover" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-admin-text">{p.name}</span>
                          <span className={`block ${ADMIN_TEXT_MUTED}`}>
                            {p.product_images.length === 1 ? "1 foto" : `${p.product_images.length} fotos`}
                            {p.product_variants.length > 0 && ` · ${formatPriceRange(p.product_variants.map((v) => v.price))}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : (
          <>
            {!fixedProductId && (
              <button
                type="button"
                onClick={() => {
                  setProductId("");
                  setCutout(null);
                }}
                className="self-start text-[13px] font-semibold underline underline-offset-2"
              >
                Elegir otra funda
              </button>
            )}

            <div>
              <p className={ADMIN_LABEL}>Elegí la foto</p>
              {photos.length === 0 ? (
                <p className={ADMIN_TEXT_MUTED}>Esta funda no tiene fotos cargadas: subí una.</p>
              ) : (
                <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {photos.map((img) => (
                    <li key={img.id}>
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => choose(img.url)}
                        className="block aspect-[4/5] w-full overflow-hidden rounded border border-admin-border bg-admin-bg hover:border-admin-ink"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage. */}
                        <img src={img.url} alt="" className="size-full object-cover" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex items-center gap-2">
                <PickPhotoButton disabled={working} onError={setError} onPick={(file) => choose(file)}>
                  Subir otra foto
                </PickPhotoButton>
                <span className={ADMIN_TEXT_MUTED}>Con fondo liso o ya sin fondo.</span>
              </div>
              <div className="mt-1.5">
                <SizeHint size={PHOTO_SIZES.cutout} />
              </div>
            </div>

            {working && !cutout && <p className={ADMIN_TEXT_MUTED}>Recortando…</p>}

            {cutout && (
              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                {/* Sobre el color de la página, como se va a ver. */}
                <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-admin-border bg-[#fafaf8] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa del recorte (blob). */}
                  <img src={cutout.previewUrl} alt="Recorte de la funda" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-[15px] text-admin-text">
                    Así queda el recorte. Si se comió parte de la funda o quedó fondo, probá con otra foto (con el fondo más
                    parejo).
                  </p>
                  <label className="flex items-center gap-3">
                    <input
                      type="color"
                      value={edgeColor}
                      onChange={(e) => setEdgeColor(e.target.value)}
                      className="h-11 w-11 shrink-0 cursor-pointer rounded-md border border-admin-border-strong bg-admin-surface p-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-admin-text">Color del canto</span>
                      <span className={ADMIN_TEXT_MUTED}>
                        El borde del teléfono que se ve de costado mientras gira en la home. Se calcula solo de la foto:
                        cambialo solo si no coincide con el marco de la funda.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {cutout && warning && <AdminNotice kind="ink">{warning.replace("La foto mide", "La funda recortada mide")}</AdminNotice>}
        {error && <AdminNotice kind="danger">{error}</AdminNotice>}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => dialogRef.current?.close()} className={adminButton("secondary")}>
            Cancelar
          </button>
          <button type="button" onClick={confirm} disabled={!cutout || working} className={adminButton("primary")}>
            {working && cutout ? "Guardando…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
