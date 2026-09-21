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
    <div className="space-y-4 py-10 text-center">
      <h1 className="text-xl font-semibold">No pudimos cargar el catálogo</h1>
      <p className="text-zinc-600">Probá de nuevo en unos segundos.</p>
      <button
        onClick={() => retry()}
        className="h-12 rounded-xl bg-zinc-900 px-6 font-medium text-white"
      >
        Reintentar
      </button>
    </div>
  );
}
