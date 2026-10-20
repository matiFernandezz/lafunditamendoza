"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminLogo from "../AdminLogo";
import AdminNotice from "../AdminNotice";

// Controles sobre la tarjeta negra: etiqueta en crema e input blanco cálido sin
// borde, con anillo crema al enfocar (el contorno negro global no se vería).
const LABEL = "mb-1.5 block text-[15px] font-semibold text-admin-on-ink";
const INPUT =
  "h-12 w-full min-w-0 rounded-lg bg-admin-surface px-3.5 text-base text-admin-text outline-none transition-shadow duration-200 focus:ring-2 focus:ring-admin-on-ink/70 focus:ring-offset-2 focus:ring-offset-admin-ink";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : signInError.message,
      );
      setSubmitting(false);
      return;
    }

    router.push("/admin/ventas");
    router.refresh();
  }

  // Fondo crema con la marca repetida como marca de agua y una tarjeta negra
  // centrada con el logo en crema (igual en mobile, con 16px de margen).
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-admin-bg bg-[url(/brand/login-pattern.png)] bg-size-[270px_280px] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[22px] bg-admin-ink px-6 pb-9 pt-7 sm:px-8">
        <div className="flex justify-center">
          <AdminLogo size={80} />
        </div>
        <h1 className="sr-only">Acceso al panel</h1>

        <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-5">
          <div>
            <label htmlFor="email" className={LABEL}>
              Mail
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className={INPUT}
            />
          </div>

          <div>
            <label htmlFor="password" className={LABEL}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className={INPUT}
            />
          </div>

          {error && <AdminNotice kind="danger">{error}</AdminNotice>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-lg bg-admin-bg text-base font-semibold text-admin-text transition-[transform,background-color,opacity] duration-200 hover:bg-admin-surface focus-visible:outline-admin-on-ink active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
