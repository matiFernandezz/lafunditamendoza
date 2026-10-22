export const SECTION_KEYS = ["categorias", "mas_vendidas", "ultimos"] as const;
export const SECTION_SELECT = "key, sort_order, visible, title";

export const isSectionKey = (value: unknown): value is (typeof SECTION_KEYS)[number] =>
  typeof value === "string" && (SECTION_KEYS as readonly string[]).includes(value);
