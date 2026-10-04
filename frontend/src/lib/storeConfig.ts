// Datos de cobro de las ventas web: se muestran en la pantalla de la reserva.
// Son datos públicos (cualquiera que compra los ve), por eso viven en el código.
// Sin CBU por ahora: la reserva muestra solo el alias.

export const TRANSFER = {
  alias: "lafunditamendoza",
  cbu: null as string | null,
  holder: "Matías Tomás Fernández Rossi",
};

// WhatsApp de la tienda (+54 9 261 673 2438), formato de wa.me: sin "+" ni espacios.
export const STORE_WHATSAPP = "5492616732438";

// Contacto y redes (footer y página Nosotros).
export const WHATSAPP = { url: `https://wa.me/${STORE_WHATSAPP}`, handle: "261 673 2438" };
export const INSTAGRAM = { url: "https://www.instagram.com/lafunditamza/", handle: "@lafunditamza" };
export const TIKTOK = { url: "https://www.tiktok.com/@lafunditamza", handle: "@lafunditamza" };

export const RESERVATION_HOURS = 24;
