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
      <label htmlFor="modelo" className="mb-1 block text-sm font-medium text-zinc-700">
        Elegí tu iPhone
      </label>
      <select
        id="modelo"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base"
      >
        <option value="">Todos los modelos</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <p className="mt-1 h-4 text-xs text-zinc-500" aria-live="polite">
        {isPending ? "Actualizando…" : ""}
      </p>
    </div>
  );
}
