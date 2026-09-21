"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { IphoneModel } from "@/lib/catalog";

export default function ModelFilter({
  models,
  selected,
}: {
  models: IphoneModel[];
  selected: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(modelId: string) {
    const href = modelId ? `${pathname}?modelo=${modelId}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
  }

  return (
    <div>
      <label htmlFor="modelo" className="mb-2 block font-medium">
        Elegí tu iPhone
      </label>
      <div className="relative">
        <select
          id="modelo"
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-full appearance-none rounded-2xl border border-graphite bg-transparent pl-4 pr-12 text-base font-medium transition-colors duration-200 hover:border-ink"
        >
          <option value="">Todos los modelos</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2"
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </div>
      <p className="sr-only" aria-live="polite">
        {isPending ? "Actualizando…" : ""}
      </p>
    </div>
  );
}
