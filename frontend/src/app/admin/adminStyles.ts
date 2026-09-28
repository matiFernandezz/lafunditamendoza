// Piel visual compartida de /admin/*: espaciado en escala de 8px (2=8, 4=16,
// 6=24, 8=32), un solo alto/padding de botón, un solo radio (6px) y los
// colores fijos del panel (ver --admin-* en globals.css). Cada pantalla sigue
// con su propia lógica; esto solo evita que cuatro pantallas terminen con
// cuatro pieles distintas.

export const ADMIN_PAGE_TITLE = "text-2xl font-bold tracking-tight text-admin-text";
export const ADMIN_SECTION_TITLE = "text-xl font-bold tracking-tight text-admin-text";
export const ADMIN_LABEL = "mb-1.5 block text-sm font-semibold text-admin-text";
export const ADMIN_TEXT_MUTED = "text-[13px] font-normal text-admin-muted";
export const ADMIN_NAME = "text-sm font-semibold text-admin-text sm:text-base";

export const ADMIN_INPUT =
  "h-10 w-full rounded-md border border-admin-border bg-white px-3 text-sm text-admin-text placeholder:text-admin-muted focus-visible:outline-none focus-visible:border-black disabled:opacity-60";
export const ADMIN_TEXTAREA =
  "w-full rounded-md border border-admin-border bg-white p-3 text-sm text-admin-text placeholder:text-admin-muted focus-visible:outline-none focus-visible:border-black disabled:opacity-60";

// Mismo alto (40px) y padding horizontal en todos los botones del panel.
// Deshabilitado va con color propio, no con opacity: un negro al 40% sobre
// tarjeta blanca queda gris medio y se lee como un botón activo.
export const ADMIN_BUTTON_PRIMARY =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500 disabled:hover:bg-neutral-200";
export const ADMIN_BUTTON_SECONDARY =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-admin-border bg-transparent px-4 text-sm font-semibold text-admin-text transition-colors hover:bg-admin-bg disabled:opacity-40";
// Variante chica (32px) para acciones secundarias dentro de una fila (p. ej. "Quitar").
export const ADMIN_BUTTON_SECONDARY_SM =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-admin-border bg-transparent px-3 text-xs font-semibold text-admin-text transition-colors hover:bg-admin-bg disabled:opacity-40";

// Acciones destructivas (anular una venta): contorno rojo para abrir el paso
// de confirmación, rojo sólido para confirmar.
export const ADMIN_BUTTON_DANGER_OUTLINE =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-admin-danger-border bg-white px-4 text-sm font-semibold text-admin-danger transition-colors hover:bg-admin-danger-bg disabled:opacity-40";
export const ADMIN_BUTTON_DANGER =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-admin-danger px-4 text-sm font-semibold text-white transition-colors hover:brightness-95 disabled:bg-neutral-200 disabled:text-neutral-500";

export const ADMIN_CARD = "rounded-md border border-admin-border bg-white p-4 sm:p-6";
export const ADMIN_ROW_LIST = "divide-y divide-admin-border rounded-md border border-admin-border bg-white";

// Botones cuadrados de ícono (reordenar, etc.) con tooltip via title + aria-label.
export const ADMIN_ICON_BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-admin-border bg-white text-admin-muted transition-colors hover:bg-admin-bg disabled:opacity-30 disabled:hover:bg-white";
// Variante roja "suave" para acciones destructivas (eliminar).
export const ADMIN_ICON_BUTTON_DANGER =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-admin-border bg-white text-admin-danger transition-colors hover:bg-admin-danger-bg hover:border-admin-danger-border disabled:opacity-30 disabled:hover:bg-white";

export const ADMIN_ALERT_ERROR =
  "rounded-md border border-admin-danger-border bg-admin-danger-bg p-3 text-sm font-medium text-admin-danger";
export const ADMIN_ALERT_OK = "rounded-md bg-black p-3 text-sm font-medium text-white";
