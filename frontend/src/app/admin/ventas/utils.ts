import type { AdminVariant } from "@/lib/adminApi";

/** "iPhone 13 Pro Max · transparente", o el sku si no hay modelo ni color. */
export function variantLabel(variant: AdminVariant, modelName?: string): string {
  const parts = [modelName, variant.color].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : variant.sku;
}
