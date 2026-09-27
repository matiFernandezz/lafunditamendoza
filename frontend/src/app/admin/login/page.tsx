"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_ALERT_ERROR,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_PAGE_TITLE,
  ADMIN_TEXT_MUTED,
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

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center space-y-6">
      <div>
        <h1 className={ADMIN_PAGE_TITLE}>Acceso al panel</h1>
        <p className={`mt-1 ${ADMIN_TEXT_MUTED}`}>Ingresá con tu cuenta de administrador.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={ADMIN_LABEL}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
            className={ADMIN_INPUT}
            placeholder="••••••••"
          />
        </div>

        {error && <p role="alert" className={ADMIN_ALERT_ERROR}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className={`${ADMIN_BUTTON_PRIMARY} w-full`}
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
