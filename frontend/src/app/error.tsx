"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-5 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        No pudimos cargar el catálogo
      </h1>
      <p className="text-graphite">Probá de nuevo en unos segundos.</p>
      <button
        onClick={() => retry()}
        className="h-14 rounded-2xl bg-ink px-6 font-medium text-paper transition-transform duration-200 active:scale-[0.98]"
      >
        Reintentar
      </button>
    </div>
  );
}
