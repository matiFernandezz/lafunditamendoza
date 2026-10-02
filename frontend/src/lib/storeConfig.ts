// Datos de cobro de las ventas web. Mientras no estén cargadas las variables
// NEXT_PUBLIC_TRANSFER_* (en .env.local / Vercel) se usan DATOS DE PRUEBA, y
// la pantalla de la reserva lo avisa.

const alias = process.env.NEXT_PUBLIC_TRANSFER_ALIAS;
const cbu = process.env.NEXT_PUBLIC_TRANSFER_CBU;

export const TRANSFER = {
  alias: alias || "lafundita.mza",
  cbu: cbu || "0000003100012345678901",
  holder: process.env.NEXT_PUBLIC_TRANSFER_HOLDER || "La Fundita",
  bank: process.env.NEXT_PUBLIC_TRANSFER_BANK || "Mercado Pago",
  isTestData: !alias || !cbu,
};

// El mismo número que ya usa la tienda para las consultas.
export const STORE_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5492610000000";

export const RESERVATION_HOURS = 24;
