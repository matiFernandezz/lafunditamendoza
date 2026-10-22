"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  createHomeSlide,
  deleteHomeSlide,
  getHomeSlides,
  reorderHomeSlides,
  updateHomeSlide,
  uploadStoreImage,
  type HomeSlide,
  type HomeSlideInput,
  type HomeSlideKind,
} from "@/lib/adminApi";
import AdminNotice from "../AdminNotice";
import {
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminInput,
} from "../adminStyles";
import { PHOTO_SIZES, PickPhotoButton, ReorderButtons, SizeHint, moveItem } from "./storeUi";

const KINDS: { value: HomeSlideKind; label: string; hint: string }[] = [
  { value: "foto", label: "Solo la foto", hint: "Sin nada encima." },
  { value: "titulo", label: "Titular", hint: "Etiqueta chica, titular grande y un botón opcional." },
  { value: "rango", label: "Rango de modelos", hint: "“iPhone 11 → 18 Pro Max” y la bajada de la marca." },
  { value: "logo", label: "Logo", hint: "El logo grande abajo a la izquierda." },
];

const POSITIONS = [
  { value: "", label: "Centro" },
  { value: "center 25%", label: "Más arriba" },
  { value: "center 75%", label: "Más abajo" },
];

// Brillo de la foto debajo del texto (1 = como está). Automático: el logo va más oscuro.
const DIMS = [
  { value: "", label: "Automático" },
  { value: "1", label: "Nada" },
  { value: "0.8", label: "Un poco" },
  { value: "0.55", label: "Bastante" },
];

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

type Draft = Required<Pick<HomeSlideInput, "kind">> & {
  alt: string;
  label: string;
  title: string;
  cta_label: string;
  cta_href: string;
  position: string;
  dim: string;
};

function toDraft(slide: HomeSlide): Draft {
  return {
    kind: slide.kind,
    alt: slide.alt,
    label: slide.label ?? "",
    title: slide.title ?? "",
    cta_label: slide.cta_label ?? "",
    cta_href: slide.cta_href ?? "",
    position: slide.position ?? "",
    dim: slide.dim === null ? "" : String(slide.dim),
  };
}

function draftPatch(draft: Draft): HomeSlideInput {
  return {
    kind: draft.kind,
    alt: draft.alt,
    label: draft.label.trim() || null,
    title: draft.title.trim() || null,
    cta_label: draft.cta_label.trim() || null,
    cta_href: draft.cta_href.trim() || null,
    position: draft.position || null,
    dim: draft.dim === "" ? null : Number(draft.dim),
  };
}

/** Un slide: la foto como se ve en la portada, sus datos y sus acciones. */
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
  const [draft, setDraft] = useState(() => toDraft(slide));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(slide));
  const set = (field: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [field]: e.target.value }));
  const id = (field: string) => `slide-${slide.id}-${field}`;

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
  // La vista previa oscurece igual que la home (el logo, por defecto, al 0.55).
  const brightness = draft.dim ? Number(draft.dim) : draft.kind === "logo" ? 0.55 : 1;
  const previewStyle = { objectPosition: draft.position || "center", filter: `brightness(${brightness})` };

  return (
    <li className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded bg-admin-ink px-2 py-0.5 font-mono text-xs font-semibold text-admin-on-ink">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <ReorderButtons index={index} total={total} disabled={disabled} onMove={onMove} label={`la foto ${index + 1}`} />
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

          {/* Computadora: así se recorta en la portada apaisada. */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-admin-text">Foto para computadora</p>
            <div className="relative aspect-[1584/722] overflow-hidden rounded-md bg-admin-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto tal cual. */}
              <img src={slide.image_url} alt="" className="size-full object-cover" style={previewStyle} />
            </div>
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
                Cambiar
              </PickPhotoButton>
            </div>
            <SizeHint size={PHOTO_SIZES.heroDesktop} />
          </div>

          {/* Celular: vertical 4:5. Sin foto propia, recorta la de computadora. */}
          <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-admin-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto tal cual. */}
              <img
                src={slide.mobile_image_url ?? slide.image_url}
                alt=""
                className={`size-full object-cover ${slide.mobile_image_url ? "" : "opacity-60"}`}
                style={previewStyle}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-admin-text">
                Foto para celular <span className="font-normal text-admin-muted">(opcional)</span>
              </p>
              <p className="text-[13px] text-admin-muted">
                {slide.mobile_image_url
                  ? "En el celular se ve esta foto vertical."
                  : "Sin foto propia: el celular recorta la de computadora (así, más clara). Si no queda bien, subí una vertical."}
              </p>
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
                  {slide.mobile_image_url ? "Cambiar" : "Subir foto de celular"}
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
                    Usar la de computadora
                  </button>
                )}
              </div>
              <SizeHint size={PHOTO_SIZES.heroMobile} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor={id("kind")} className={ADMIN_LABEL}>
              Qué va encima
            </label>
            <select id={id("kind")} value={draft.kind} onChange={set("kind")} disabled={disabled} className={ADMIN_INPUT}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <p className={`mt-1 ${ADMIN_TEXT_MUTED}`}>{KINDS.find((k) => k.value === draft.kind)?.hint}</p>
          </div>

          {draft.kind === "titulo" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor={id("title")} className={ADMIN_LABEL}>
                  Titular
                </label>
                <input id={id("title")} maxLength={120} value={draft.title} onChange={set("title")} disabled={disabled} className={ADMIN_INPUT} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={id("label")} className={ADMIN_LABEL}>
                  Etiqueta <span className="font-normal text-admin-muted">(opcional, arriba del titular)</span>
                </label>
                <input id={id("label")} maxLength={80} value={draft.label} onChange={set("label")} disabled={disabled} className={ADMIN_INPUT} />
              </div>
              <div>
                <label htmlFor={id("cta_label")} className={ADMIN_LABEL}>
                  Texto del botón
                </label>
                <input
                  id={id("cta_label")}
                  maxLength={40}
                  value={draft.cta_label}
                  onChange={set("cta_label")}
                  placeholder="Ver más"
                  disabled={disabled}
                  className={ADMIN_INPUT}
                />
              </div>
              <div>
                <label htmlFor={id("cta_href")} className={ADMIN_LABEL}>
                  Lleva a
                </label>
                <input
                  id={id("cta_href")}
                  maxLength={300}
                  value={draft.cta_href}
                  onChange={set("cta_href")}
                  placeholder="/categoria/fundas"
                  disabled={disabled}
                  className={adminInput({ mono: true })}
                />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={id("position")} className={ADMIN_LABEL}>
                Encuadre
              </label>
              <select id={id("position")} value={draft.position} onChange={set("position")} disabled={disabled} className={ADMIN_INPUT}>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={id("dim")} className={ADMIN_LABEL}>
                Oscurecer
              </label>
              <select id={id("dim")} value={draft.dim} onChange={set("dim")} disabled={disabled} className={ADMIN_INPUT}>
                {DIMS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={id("alt")} className={ADMIN_LABEL}>
              Qué se ve en la foto <span className="font-normal text-admin-muted">(para buscadores y lectores de pantalla)</span>
            </label>
            <input id={id("alt")} maxLength={200} value={draft.alt} onChange={set("alt")} disabled={disabled} className={ADMIN_INPUT} />
          </div>

          {dirty && (
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(toDraft(slide))} disabled={disabled} className={adminButton("ghost", "sm")}>
                Descartar
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  run(async () => {
                    const res = await updateHomeSlide(slide.id, draftPatch(draft));
                    onChanged(res.data, "Cambios guardados.");
                  })
                }
                className={adminButton("primary", "sm")}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          )}
        </div>
      </div>
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
        !error && <p className={`py-10 text-center ${ADMIN_TEXT_MUTED}`}>Cargando…</p>
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
