// lucide ya no trae logos de marcas: van como SVG propios, del mismo trazo fino.
// Los usan el footer y la página Nosotros.

const PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "size-5",
} as const;

export function InstagramIcon() {
  return (
    <svg {...PROPS}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function TikTokIcon() {
  return (
    <svg {...PROPS}>
      <path d="M14 3v11.5a4 4 0 1 1-4-4" />
      <path d="M14 3c.4 2.6 2.2 4.6 5 5" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg {...PROPS}>
      <path d="M3.5 20.5l1.3-4.6A8.5 8.5 0 1 1 8.2 19.3z" />
      <path d="M9 8.8c0 3 2.4 5.6 5.4 6.1l1.3-1.5-1.9-1-0.9 0.8c-1-.4-1.8-1.2-2.2-2.2l0.8-0.9-1-1.9z" />
    </svg>
  );
}
