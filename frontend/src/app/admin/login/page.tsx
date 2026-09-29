"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import AdminNotice from "../AdminNotice";
import {
  ADMIN_CAP,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_SUBTITLE,
  ADMIN_PAGE_TITLE,
  adminButton,
} from "../adminStyles";

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

  // Mobile: pantalla blanca con el bloque negro arriba. Desktop: tarjeta de
  // 440px centrada sobre el gris del panel.
  return (
    <div className="flex min-h-screen w-full bg-white lg:items-center lg:justify-center lg:bg-admin-bg lg:p-6">
      <div className="flex w-full flex-col overflow-hidden bg-white lg:max-w-[440px] lg:rounded-lg lg:border lg:border-admin-border">
        <div className="flex flex-col gap-3 bg-admin-ink px-5 pb-8 pt-12 lg:px-8 lg:py-7">
          <span className="lg:hidden">
            <Logo size={112} />
          </span>
          <span className="hidden lg:block">
            <Logo size={96} />
          </span>
          <span className={`${ADMIN_CAP} text-white/60`}>Panel de administración</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-7 lg:p-8">
          <div>
            <h1 className={ADMIN_PAGE_TITLE}>Acceso al panel</h1>
            <p className={ADMIN_PAGE_SUBTITLE}>Ingresá con tu cuenta de administrador.</p>
          </div>

          <div>
            <label htmlFor="email" className={ADMIN_LABEL}>
              Email
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
              className={ADMIN_INPUT}
              placeholder="admin@lafundita.com"
            />
          </div>

          <div>
            <label htmlFor="password" className={ADMIN_LABEL}>
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
              className={ADMIN_INPUT}
              placeholder="••••••••"
            />
          </div>

          {error && <AdminNotice kind="danger">{error}</AdminNotice>}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className={`${adminButton("primary", "lg")} w-full`}
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
