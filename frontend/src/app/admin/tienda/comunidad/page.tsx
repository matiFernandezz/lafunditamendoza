"use client";

import { ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  createCommunityPhoto,
  deleteCommunityPhoto,
  getCommunity,
  reorderCommunityPhotos,
  updateCommunity,
  uploadStoreImage,
  type CommunityContent,
  type CommunityPhoto,
} from "@/lib/adminApi";
import AdminLoading from "../../AdminLoading";
import AdminNotice from "../../AdminNotice";
import {
  ADMIN_CARD,
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminIconButton,
} from "../../adminStyles";
import { PHOTO_SIZES, PickPhotoButton, ReorderButtons, SizeHint, moveItem } from "../storeUi";

const TEXT_FIELDS = [
  { key: "title", label: "Título", max: 60 },
  { key: "subtitle", label: "Subtítulo", max: 120 },
  { key: "cta_label", label: "Texto del botón (lleva al perfil de Instagram)", max: 40 },
] as const;

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/** Tienda › Comunidad: los textos y las capturas de clientes que van debajo de los posts de Instagram en la home. */
export default function ComunidadAdminPage() {
  const [content, setContent] = useState<CommunityContent | null>(null);
  const [draft, setDraft] = useState<CommunityContent>({ title: "", subtitle: "", cta_label: "" });
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getCommunity()
      .then((res) => {
        if (ignore) return;
        setContent(res.data.content);
        setDraft(res.data.content);
        setPhotos(res.data.photos);
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

  function movePhoto(index: number, delta: -1 | 1) {
    const next = moveItem(photos, index, delta);
    setPhotos(next);
    void run(async () => {
      await reorderCommunityPhotos(next.map((p) => p.id));
      setNotice("Orden de las fotos guardado.");
    });
  }

  const dirty =
    content !== null &&
    (draft.title !== content.title || draft.subtitle !== content.subtitle || draft.cta_label !== content.cta_label);

  return (
    <div className="flex max-w-[1000px] flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Comunidad</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            Las capturas de los clientes que etiquetan a La Fundita. Van en la home, debajo de los posts de Instagram;
            el lugar de toda la sección se cambia en Tienda › Secciones.
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className={adminButton("secondary", "sm")}>
          Ver la tienda
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
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

      {!content ? (
        !error && <AdminLoading />
      ) : (
        <>
          <section className={`${ADMIN_CARD} flex flex-col gap-3`}>
            <h2 className={ADMIN_SECTION_TITLE}>Textos</h2>
            {TEXT_FIELDS.map((field) => (
              <div key={field.key}>
                <label htmlFor={`community-${field.key}`} className={ADMIN_LABEL}>
                  {field.label}
                </label>
                <input
                  id={`community-${field.key}`}
                  maxLength={field.max}
                  value={draft[field.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  disabled={busy}
                  className={ADMIN_INPUT}
                />
              </div>
            ))}
            <p className={ADMIN_TEXT_MUTED}>El subtítulo puede quedar vacío.</p>
            {dirty && (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(content)}
                  disabled={busy}
                  className={adminButton("ghost", "sm")}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const res = await updateCommunity(draft);
                      setContent(res.data);
                      setDraft(res.data);
                      setNotice("Textos guardados.");
                    })
                  }
                  className={adminButton("primary", "sm")}
                >
                  {busy ? "Guardando…" : "Guardar"}
                </button>
              </div>
            )}
          </section>

          <section className={`${ADMIN_CARD} flex flex-col gap-3`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className={ADMIN_SECTION_TITLE}>Fotos</h2>
                <p className={ADMIN_TEXT_MUTED}>
                  Se deslizan de costado, en este orden. Podés subir todas las que quieras. Sin fotos, la sección no
                  muestra el carrusel.
                </p>
              </div>
              <PickPhotoButton
                kind="primary"
                disabled={busy}
                onError={setError}
                onWarn={setWarning}
                recommended={PHOTO_SIZES.story}
                onPick={(file) =>
                  run(async () => {
                    const url = await uploadStoreImage(file, file.type);
                    const res = await createCommunityPhoto(url);
                    setPhotos((prev) => [...prev, res.data]);
                    setNotice("Foto agregada al final.");
                  })
                }
              >
                <ImagePlus aria-hidden="true" className="size-4" />
                {busy ? "Subiendo…" : "Agregar foto"}
              </PickPhotoButton>
            </div>
            <SizeHint size={PHOTO_SIZES.story} />
            {photos.length === 0 ? (
              <p className={ADMIN_EMPTY}>Todavía no hay fotos. Agregá la primera.</p>
            ) : (
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="flex flex-col gap-2">
                    <div className="relative aspect-[9/16] overflow-hidden rounded-md bg-admin-ink">
                      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto tal cual. */}
                      <img src={photo.image_url} alt="" className="size-full object-cover" />
                      <span className="absolute left-2 top-2 rounded bg-admin-ink px-1.5 py-0.5 font-mono text-xs font-semibold text-admin-on-ink">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <ReorderButtons
                        index={index}
                        total={photos.length}
                        disabled={busy}
                        onMove={(delta) => movePhoto(index, delta)}
                        label={`la foto ${index + 1}`}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await deleteCommunityPhoto(photo.id);
                            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
                            setNotice("Foto quitada.");
                          })
                        }
                        aria-label={`Quitar la foto ${index + 1}`}
                        title="Quitar"
                        className={adminIconButton("danger", "sm")}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
