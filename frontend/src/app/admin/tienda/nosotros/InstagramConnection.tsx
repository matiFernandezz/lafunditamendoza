"use client";

import { useEffect, useState } from "react";
import {
  AdminApiError,
  connectInstagram,
  disconnectInstagram,
  getInstagramStatus,
  type InstagramStatus,
} from "@/lib/adminApi";
import AdminNotice from "../../AdminNotice";
import {
  ADMIN_CARD,
  ADMIN_INPUT,
  ADMIN_SECTION_TITLE,
  ADMIN_TEXT_MUTED,
  adminBadge,
  adminButton,
} from "../../adminStyles";

const dateFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Conexión con Instagram: con la clave de acceso de la cuenta, Nosotros muestra
 * solos los últimos posts. La clave se renueva sola en el servidor.
 */
export default function InstagramConnection({
  onNotice,
  onError,
}: {
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    getInstagramStatus()
      .then((res) => {
        if (!ignore) setStatus(res.data);
      })
      .catch(() => {
        if (!ignore) setStatus({ connected: false });
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      onError(err instanceof AdminApiError ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${ADMIN_CARD} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={ADMIN_SECTION_TITLE}>Instagram automático</h2>
        {status?.connected &&
          (status.lastError ? (
            <span className={adminBadge("danger")}>Con problemas</span>
          ) : (
            <span className={adminBadge("ok")}>Conectado</span>
          ))}
      </div>

      {status === null ? (
        <p className={ADMIN_TEXT_MUTED}>Cargando…</p>
      ) : status.connected ? (
        <>
          {/* Instagram respondió con un error al consultarlo ahora: se avisa con lo
              que dijo y qué se está mostrando mientras tanto. */}
          {status.lastError && (
            <AdminNotice kind="danger">
              <span className="block font-semibold">Instagram está rechazando la conexión: “{status.lastError}”</span>
              <span className="mt-1 block">
                {status.cachedAt
                  ? `Mientras tanto, Nosotros y la home muestran los últimos posts guardados (del ${dateTimeFormat.format(new Date(status.cachedAt))}), hasta 3 días.`
                  : "Mientras tanto, Nosotros muestra un link a tu perfil."}{" "}
                Para arreglarlo: developers.facebook.com › Mis apps › La Fundita Web › mirá el aviso de arriba o
                “Acciones necesarias”.
                {status.lastError.toLowerCase().includes("blocked") &&
                  " Suele ser que falta la URL de política de privacidad o la revisión del uso de datos."}
              </span>
            </AdminNotice>
          )}
          <p className={ADMIN_TEXT_MUTED}>
            Conectado con <strong className="text-admin-text">@{status.username}</strong>: Nosotros muestra solos tus
            últimos posts y reels (se actualizan cada media hora). La clave se renueva sola; vence el{" "}
            {dateFormat.format(new Date(status.expiresAt))} si no se pudiera renovar.
          </p>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await disconnectInstagram();
                  setStatus({ connected: false });
                  onNotice("Instagram desconectado: se usan los links pegados abajo.");
                })
              }
              className={adminButton("dangerOutline", "sm")}
            >
              Desconectar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={ADMIN_TEXT_MUTED}>
            Pegá la clave de acceso de la cuenta de Instagram de la tienda y Nosotros va a mostrar solos los últimos
            posts. Se saca en developers.facebook.com › tu app › Instagram › “Configuración de la API con inicio de
            sesión de Instagram” › Generar token.
          </p>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const res = await connectInstagram(token);
                setStatus(res.data);
                setToken("");
                onNotice("Instagram conectado: Nosotros ya muestra tus últimos posts.");
              });
            }}
          >
            <label htmlFor="instagram-token" className="sr-only">
              Clave de acceso de Instagram
            </label>
            <input
              id="instagram-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="IGAA…"
              disabled={busy}
              className={ADMIN_INPUT}
            />
            <button type="submit" disabled={busy || token.trim() === ""} className={adminButton("primary", "sm")}>
              {busy ? "Conectando…" : "Conectar"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
