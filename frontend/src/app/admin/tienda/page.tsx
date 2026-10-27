"use client";

import { ImagePlus, Monitor, Palette, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SlideLayers from "@/components/SlideLayers";
import {
  AdminApiError,
  createHomeSlide,
  deleteHomeSlide,
  getHomeSlides,
  reorderHomeSlides,
  updateHomeSlide,
  uploadStoreImage,
  type HomeSlide,
} from "@/lib/adminApi";
import { brightnessOf, DEVICE_FRAME, legacyLayout, type SlideDevice } from "@/lib/slideLayout";
import AdminNotice from "../AdminNotice";
import {
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
} from "../adminStyles";
import SlideEditor from "./SlideEditor";
import { PHOTO_SIZES, PickPhotoButton, ReorderButtons, SizeHint, moveItem } from "./storeUi";
import AdminLoading from "../AdminLoading";

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/**
 * Cómo se ve la foto en un dispositivo, con su diseño encima: el mismo
 * componente que la home (SlideLayers), a escala. Sin diseño guardado, el
 * equivalente aproximado del carrusel de antes.
 */
function DesignPreview({ slide, device }: { slide: HomeSlide; device: SlideDevice }) {
  const frame = DEVICE_FRAME[device];
  const layout = (slide.layout ?? legacyLayout(slide))[device];
  const photo = device === "mobile" ? (slide.mobile_image_url ?? slide.image_url) : slide.image_url;
  return (
    <div
      className="relative overflow-hidden rounded-md bg-admin-ink [&_*]:!pointer-events-none"
      style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto tal cual. */}
      <img
        src={photo}
        alt=""
        className="absolute inset-0 size-full object-cover"
        style={{ objectPosition: `${layout.focusX}% ${layout.focusY}%`, filter: `brightness(${brightnessOf(layout)})` }}
      />
      <SlideLayers layout={layout} />
    </div>
  );
}

/** Una foto del carrusel: cómo se ve en compu y en celular, sus fotos y sus acciones. */
function SlideCard({
  slide,
  index,
  total,
  busy,
  onMove,
  onChanged,
  onDeleted,
  onError,
  onWarn,
}: {
  slide: HomeSlide;
  index: number;
  total: number;
  busy: boolean;
  onMove: (delta: -1 | 1) => void;
  onChanged: (slide: HomeSlide, message: string) => void;
  onDeleted: () => void;
  onError: (message: string) => void;
  onWarn: (message: string) => void;
}) {
  const [alt, setAlt] = useState(slide.alt);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const altId = `slide-${slide.id}-alt`;

  async function run(action: () => Promise<void>) {
    setSaving(true);
    try {
      await action();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const disabled = busy || saving;

  return (
    <li className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-admin-ink px-2 py-0.5 font-mono text-xs font-semibold text-admin-on-ink">
              {String(index + 1).padStart(2, "0")}
            </span>
            {slide.layout ? (
              <span className={adminBadge("ok")}>Diseño propio</span>
            ) : (
              <span className={adminBadge("neutral")}>Diseño automático</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReorderButtons
              index={index}
              total={total}
              disabled={disabled}
              onMove={onMove}
              label={`la foto ${index + 1}`}
            />
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    run(async () => {
                      await deleteHomeSlide(slide.id);
                      onDeleted();
                    })
                  }
                  className={adminButton("danger", "sm")}
                >
                  Quitar
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className={adminButton("ghost", "sm")}>
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setConfirmDelete(true)}
                aria-label={`Quitar la foto ${index + 1}`}
                title="Quitar del carrusel"
                className={adminButton("dangerOutline", "sm")}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Así se ve en la tienda: computadora (apaisada) y celular (vertical). */}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)]">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-admin-text">
              <Monitor aria-hidden="true" className="size-4" /> Computadora
            </p>
            <DesignPreview slide={slide} device="desktop" />
            <div className="flex flex-wrap items-center gap-2">
              <PickPhotoButton
                disabled={disabled}
                onError={onError}
                onWarn={onWarn}
                recommended={PHOTO_SIZES.heroDesktop}
                onPick={(file) =>
                  run(async () => {
                    const url = await uploadStoreImage(file, file.type);
                    const res = await updateHomeSlide(slide.id, { image_url: url });
                    onChanged(res.data, "Foto de computadora cambiada.");
                  })
                }
              >
                Cambiar foto
              </PickPhotoButton>
            </div>
            <SizeHint size={PHOTO_SIZES.heroDesktop} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-admin-text">
              <Smartphone aria-hidden="true" className="size-4" /> Celular
            </p>
            <div className="max-w-[11rem]">
              <DesignPreview slide={slide} device="mobile" />
            </div>
            <div className="flex flex-wrap gap-2">
              <PickPhotoButton
                disabled={disabled}
                onError={onError}
                onWarn={onWarn}
                recommended={PHOTO_SIZES.heroMobile}
                onPick={(file) =>
                  run(async () => {
                    const url = await uploadStoreImage(file, file.type);
                    const res = await updateHomeSlide(slide.id, { mobile_image_url: url });
                    onChanged(res.data, "Foto de celular guardada.");
                  })
                }
              >
                {slide.mobile_image_url ? "Cambiar foto" : "Subir vertical"}
              </PickPhotoButton>
              {slide.mobile_image_url && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    run(async () => {
                      const res = await updateHomeSlide(slide.id, { mobile_image_url: null });
                      onChanged(res.data, "Sin foto de celular: se recorta la de computadora.");
                    })
                  }
                  className={adminButton("ghost", "sm")}
                >
                  Usar la de compu
                </button>
              )}
            </div>
            {!slide.mobile_image_url && (
              <p className={ADMIN_TEXT_MUTED}>Sin foto propia: se recorta la de computadora.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-admin-border bg-admin-bg p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={ADMIN_TEXT_MUTED}>
            {slide.layout
              ? "Textos, logo y links ubicados a mano, por separado en computadora y celular."
              : "Todavía con el diseño automático (la vista previa es aproximada). Editalo para ubicar todo a mano."}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            className={adminButton("primary", "sm")}
          >
            <Palette aria-hidden="true" className="size-4" />
            Editar diseño
          </button>
        </div>

        <div>
          <label htmlFor={altId} className={ADMIN_LABEL}>
            Qué se ve en la foto{" "}
            <span className="font-normal text-admin-muted">(para buscadores y lectores de pantalla)</span>
          </label>
          <div className="flex gap-2">
            <input
              id={altId}
              maxLength={200}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              disabled={disabled}
              className={ADMIN_INPUT}
            />
            {alt !== slide.alt && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  run(async () => {
                    const res = await updateHomeSlide(slide.id, { alt });
                    onChanged(res.data, "Descripción guardada.");
                  })
                }
                className={adminButton("primary", "md")}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* El editor ocupa toda la pantalla: va directo en el body, fuera de la tarjeta. */}
      {editing &&
        createPortal(
          <SlideEditor
            slide={slide}
            index={index}
            onClose={() => setEditing(false)}
            onSaved={(fresh) => onChanged(fresh, "Diseño guardado: ya se ve así en la tienda.")}
          />,
          document.body,
        )}
    </li>
  );
}

/** Tienda › Carrusel: las fotos de la portada, en orden. */
export default function CarruselPage() {
  const [slides, setSlides] = useState<HomeSlide[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getHomeSlides()
      .then((res) => {
        if (!ignore) setSlides(res.data);
      })
      .catch((err) => {
        if (!ignore) setError(errorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: -1 | 1) {
    if (!slides) return;
    const next = moveItem(slides, index, delta);
    setSlides(next);
    void run(async () => {
      await reorderHomeSlides(next.map((s) => s.id));
      setNotice("Orden guardado.");
    });
  }

  return (
    <div className="flex max-w-[1000px] flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Carrusel de la portada</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Las fotos grandes de arriba de la home. Pasan solas cada 6 segundos, en este orden. Cada una lleva una foto
            horizontal para computadora y, si querés, una vertical para celular.
          </p>
        </div>
        <PickPhotoButton
          kind="primary"
          disabled={busy}
          onError={setError}
          onWarn={setWarning}
          recommended={PHOTO_SIZES.heroDesktop}
          onPick={(file) =>
            run(async () => {
              const url = await uploadStoreImage(file, file.type);
              const res = await createHomeSlide({ image_url: url, kind: "foto", alt: "" });
              setSlides((prev) => [...(prev ?? []), res.data]);
              setNotice("Foto agregada al final del carrusel.");
            })
          }
        >
          <ImagePlus aria-hidden="true" className="size-4" />
          {busy ? "Subiendo…" : "Agregar foto"}
        </PickPhotoButton>
      </div>

      {notice && (
        <AdminNotice kind="ok" onClose={() => setNotice(null)}>
          {notice}
        </AdminNotice>
      )}
      {warning && (
        <AdminNotice kind="ink" onClose={() => setWarning(null)}>
          {warning}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="danger" onClose={() => setError(null)}>
          {error}
        </AdminNotice>
      )}

      {!slides ? (
        !error && <AdminLoading />
      ) : slides.length === 0 ? (
        <p className={ADMIN_EMPTY}>El carrusel está vacío: la home arranca directo en los modelos. Agregá una foto.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {slides.map((slide, index) => (
            <SlideCard
              key={slide.id}
              slide={slide}
              index={index}
              total={slides.length}
              busy={busy}
              onMove={(delta) => move(index, delta)}
              onChanged={(fresh, message) => {
                setSlides((prev) => (prev ?? []).map((s) => (s.id === fresh.id ? fresh : s)));
                setNotice(message);
                setError(null);
              }}
              onDeleted={() => {
                setSlides((prev) => (prev ?? []).filter((s) => s.id !== slide.id));
                setNotice("Foto quitada del carrusel.");
              }}
              onError={setError}
              onWarn={setWarning}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
