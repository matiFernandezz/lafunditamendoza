"use client";

import { ExternalLink, Eye, EyeOff, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminApiError,
  createAboutPhoto,
  createSocialPost,
  deleteAboutPhoto,
  deleteSocialPost,
  getAbout,
  reorderAboutPhotos,
  reorderSocialPosts,
  updateAbout,
  uploadStoreImage,
  type AboutPage,
  type AboutPhoto,
  type SocialPost,
} from "@/lib/adminApi";
import AdminNotice from "../../AdminNotice";
import {
  ADMIN_CARD,
  ADMIN_EMPTY,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXTAREA,
  ADMIN_TEXT_MUTED,
  adminButton,
  adminIconButton,
} from "../../adminStyles";
import { PHOTO_SIZES, PickPhotoButton, ReorderButtons, SizeHint, moveItem } from "../storeUi";
import InstagramConnection from "./InstagramConnection";
import AdminLoading from "../../AdminLoading";

const NETWORKS = [
  {
    value: "instagram",
    label: "Instagram",
    placeholder: "https://www.instagram.com/p/…",
    hint: "En el post o reel: los tres puntitos › Copiar enlace.",
    auto: "Con Instagram conectado (arriba) se muestran solos los últimos posts; estos links quedan de respaldo por si la conexión falla.",
  },
  {
    value: "tiktok",
    label: "TikTok",
    placeholder: "https://www.tiktok.com/@lafunditamza/video/…",
    hint: "Desde la compu: abrí el video y copiá la dirección de la barra.",
    auto: "Sin links, se muestra solo el perfil de TikTok con los últimos videos. Pegá links solo si querés elegir cuáles.",
  },
] as const;

function errorMessage(err: unknown) {
  return err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.";
}

/** Tienda › Nosotros: el texto, las fotos de al lado y las publicaciones de las redes. */
export default function NosotrosAdminPage() {
  const [page, setPage] = useState<AboutPage | null>(null);
  const [draft, setDraft] = useState<AboutPage>({ title: "", body: "", show_tiktok: false });
  const [photos, setPhotos] = useState<AboutPhoto[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [links, setLinks] = useState({ instagram: "", tiktok: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getAbout()
      .then((res) => {
        if (ignore) return;
        setPage(res.data.page);
        setDraft(res.data.page);
        setPhotos(res.data.photos);
        setPosts(res.data.posts);
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
      await reorderAboutPhotos(next.map((p) => p.id));
      setNotice("Orden de las fotos guardado.");
    });
  }

  // Las publicaciones se ordenan dentro de su red; el orden se guarda con toda la lista.
  function movePost(network: SocialPost["network"], index: number, delta: -1 | 1) {
    const mine = moveItem(
      posts.filter((p) => p.network === network),
      index,
      delta,
    );
    const next = [...posts.filter((p) => p.network !== network), ...mine];
    setPosts(next);
    void run(async () => {
      await reorderSocialPosts(next.map((p) => p.id));
      setNotice("Orden guardado.");
    });
  }

  const dirty = page !== null && (draft.title !== page.title || draft.body !== page.body);

  return (
    <div className="flex max-w-[1000px] flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ADMIN_PAGE_TITLE}>Nosotros</h1>
          <p className={ADMIN_PAGE_SUBTITLE}>
            El texto de la página, las fotos que van al lado y las publicaciones de Instagram y TikTok que se muestran.
          </p>
        </div>
        <a href="/nosotros" target="_blank" rel="noreferrer" className={adminButton("secondary", "sm")}>
          Ver la página
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

      {!page ? (
        !error && <AdminLoading />
      ) : (
        <>
          {/* Texto */}
          <section className={`${ADMIN_CARD} flex flex-col gap-3`}>
            <h2 className={ADMIN_SECTION_TITLE}>Texto</h2>
            <div>
              <label htmlFor="about-title" className={ADMIN_LABEL}>
                Título
              </label>
              <input
                id="about-title"
                maxLength={60}
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                disabled={busy}
                className={ADMIN_INPUT}
              />
            </div>
            <div>
              <label htmlFor="about-body" className={ADMIN_LABEL}>
                Texto
              </label>
              <textarea
                id="about-body"
                rows={8}
                maxLength={2000}
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                disabled={busy}
                className={ADMIN_TEXTAREA}
              />
              <p className={`mt-1 ${ADMIN_TEXT_MUTED}`}>Dejá una línea en blanco entre párrafos.</p>
            </div>
            {dirty && (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(page)}
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
                      const res = await updateAbout({ title: draft.title, body: draft.body });
                      setPage(res.data);
                      setDraft(res.data);
                      setNotice("Texto guardado.");
                    })
                  }
                  className={adminButton("primary", "sm")}
                >
                  {busy ? "Guardando…" : "Guardar"}
                </button>
              </div>
            )}
          </section>

          {/* Fotos */}
          <section className={`${ADMIN_CARD} flex flex-col gap-3`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className={ADMIN_SECTION_TITLE}>Fotos</h2>
                <p className={ADMIN_TEXT_MUTED}>
                  Van al lado del texto y pasan solas, en este orden. Con una sola foto, queda fija.
                </p>
              </div>
              <PickPhotoButton
                kind="primary"
                disabled={busy}
                onError={setError}
                onWarn={setWarning}
                recommended={PHOTO_SIZES.tile}
                onPick={(file) =>
                  run(async () => {
                    const url = await uploadStoreImage(file, file.type);
                    const res = await createAboutPhoto(url);
                    setPhotos((prev) => [...prev, res.data]);
                    setNotice("Foto agregada al final.");
                  })
                }
              >
                <ImagePlus aria-hidden="true" className="size-4" />
                {busy ? "Subiendo…" : "Agregar foto"}
              </PickPhotoButton>
            </div>
            <SizeHint size={PHOTO_SIZES.tile} />
            {photos.length === 0 ? (
              <p className={ADMIN_EMPTY}>Sin fotos: el texto ocupa todo el ancho. Agregá una.</p>
            ) : (
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="flex flex-col gap-2">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-admin-ink">
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
                            await deleteAboutPhoto(photo.id);
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

          <InstagramConnection onNotice={setNotice} onError={setError} />

          {/* Publicaciones */}
          {NETWORKS.map((network) => {
            const mine = posts.filter((p) => p.network === network.value);
            return (
              <section key={network.value} className={`${ADMIN_CARD} flex flex-col gap-3`}>
                <div>
                  <h2 className={ADMIN_SECTION_TITLE}>Publicaciones de {network.label}</h2>
                  <p className={ADMIN_TEXT_MUTED}>{network.auto}</p>
                </div>
                {network.value === "tiktok" && (
                  <div className="flex flex-col gap-2 rounded-md border border-admin-border bg-admin-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[15px] text-admin-text">
                      {page.show_tiktok
                        ? "La sección de TikTok se ve en la página Nosotros."
                        : "La sección de TikTok está oculta: no se ve en la página Nosotros."}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const res = await updateAbout({ show_tiktok: !page.show_tiktok });
                          setPage(res.data);
                          setNotice(res.data.show_tiktok ? "TikTok vuelve a mostrarse en Nosotros." : "TikTok quedó oculto en Nosotros.");
                        })
                      }
                      className={adminButton(page.show_tiktok ? "secondary" : "primary", "sm")}
                    >
                      {page.show_tiktok ? (
                        <EyeOff aria-hidden="true" className="size-4" />
                      ) : (
                        <Eye aria-hidden="true" className="size-4" />
                      )}
                      {page.show_tiktok ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                )}
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      const res = await createSocialPost(links[network.value]);
                      if (res.data.network !== network.value) {
                        setNotice(
                          `Ese link es de ${res.data.network === "instagram" ? "Instagram" : "TikTok"}: quedó en esa lista.`,
                        );
                      } else {
                        setNotice("Publicación agregada.");
                      }
                      setPosts((prev) => [...prev, res.data]);
                      setLinks((l) => ({ ...l, [network.value]: "" }));
                    });
                  }}
                >
                  <label htmlFor={`link-${network.value}`} className="sr-only">
                    Link de {network.label}
                  </label>
                  <input
                    id={`link-${network.value}`}
                    type="url"
                    value={links[network.value]}
                    onChange={(e) => setLinks((l) => ({ ...l, [network.value]: e.target.value }))}
                    placeholder={network.placeholder}
                    disabled={busy}
                    className={ADMIN_INPUT}
                  />
                  <button
                    type="submit"
                    disabled={busy || links[network.value].trim() === ""}
                    className={adminButton("primary", "sm")}
                  >
                    Agregar
                  </button>
                </form>
                <p className={ADMIN_TEXT_MUTED}>{network.hint}</p>
                {mine.length > 0 && (
                  <ol className="flex flex-col divide-y divide-admin-border rounded-md border border-admin-border">
                    {mine.map((post, index) => (
                      <li key={post.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="font-mono text-xs font-semibold text-admin-muted">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate font-mono text-[13px] text-admin-text underline-offset-2 hover:underline"
                        >
                          {post.url.replace(/^https:\/\/(www\.)?/, "")}
                        </a>
                        <ReorderButtons
                          index={index}
                          total={mine.length}
                          disabled={busy}
                          onMove={(delta) => movePost(network.value, index, delta)}
                          label={`la publicación ${index + 1}`}
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await deleteSocialPost(post.id);
                              setPosts((prev) => prev.filter((p) => p.id !== post.id));
                              setNotice("Publicación quitada.");
                            })
                          }
                          aria-label={`Quitar la publicación ${index + 1}`}
                          title="Quitar"
                          className={adminIconButton("danger", "sm")}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
