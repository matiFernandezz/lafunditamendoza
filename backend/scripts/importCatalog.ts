/**
 * Import idempotente del catálogo real (PDF de 57 capturas del catálogo de
 * WhatsApp Business) a la base LOCAL. Ver el resumen que Claude entregó en el
 * chat para la lista de supuestos y dudas. NO tocar contra Supabase Cloud.
 *
 * Uso: cd backend && npx ts-node scripts/importCatalog.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Faltan SUPABASE_URL / SERVICE_ROLE_KEY en backend/.env');
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Modelos de iPhone: códigos cortos -> nombre real en iphone_models.
// ---------------------------------------------------------------------------
const MODEL_NAME: Record<string, string> = {
  IP11: 'iPhone 11',
  IP11PRO: 'iPhone 11 Pro',
  IP11PROMAX: 'iPhone 11 Pro Max',
  IP12: 'iPhone 12',
  IP12PRO: 'iPhone 12 Pro',
  IP12PROMAX: 'iPhone 12 Pro Max',
  IP13: 'iPhone 13',
  IP13PRO: 'iPhone 13 Pro',
  IP13PROMAX: 'iPhone 13 Pro Max',
  IP14: 'iPhone 14',
  IP14PRO: 'iPhone 14 Pro',
  IP14PROMAX: 'iPhone 14 Pro Max',
  IP15: 'iPhone 15',
  IP15PRO: 'iPhone 15 Pro',
  IP15PROMAX: 'iPhone 15 Pro Max',
  IP16: 'iPhone 16',
  IP16PRO: 'iPhone 16 Pro',
  IP16PROMAX: 'iPhone 16 Pro Max',
  IP17: 'iPhone 17',
  IP17PRO: 'iPhone 17 Pro',
  IP17PROMAX: 'iPhone 17 Pro Max',
  IPAIR: 'iPhone Air',
};

// Todos los modelos reales menos iPhone Air (para los rangos "desde 11 al 17…"
// de vidrios/lentes, truncados en el PDF -- ver aviso en el resumen final).
const ALL_EXCEPT_AIR = Object.keys(MODEL_NAME).filter((k) => k !== 'IPAIR');

type Entry = { models: string[] | null; colors: string[]; price: number };
type ProductDef = { name: string; category: string; entries: Entry[] };

const U = ['Único'];

const products: ProductDef[] = [
  // ------------------------------------------------------------ De diseño --
  {
    name: 'Estelar Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: U, price: 9500 },
      { models: ['IP13', 'IP14'], colors: U, price: 9500 },
      { models: ['IP17PROMAX'], colors: U, price: 9500 },
      { models: ['IP17PRO'], colors: U, price: 9500 },
      { models: ['IP17'], colors: U, price: 9500 },
      { models: ['IP16PROMAX'], colors: U, price: 9500 },
      { models: ['IP16PRO'], colors: U, price: 9500 },
      { models: ['IP16'], colors: U, price: 9500 },
      { models: ['IP15PROMAX'], colors: U, price: 9500 },
      { models: ['IP15PRO'], colors: U, price: 9500 },
      { models: ['IP15'], colors: U, price: 9500 },
    ],
  },
  {
    name: 'Chessy Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: U, price: 9000 },
      { models: ['IP13', 'IP14'], colors: U, price: 9000 },
      { models: ['IP12', 'IP12PRO'], colors: U, price: 9000 },
      { models: ['IP11'], colors: U, price: 9000 },
      { models: ['IP16PROMAX'], colors: U, price: 9000 },
      { models: ['IP16PRO'], colors: U, price: 9000 },
      { models: ['IP16'], colors: U, price: 9000 },
      { models: ['IP15PROMAX'], colors: U, price: 9000 },
      { models: ['IP14PRO'], colors: U, price: 9000 },
      { models: ['IP14PROMAX'], colors: U, price: 9000 },
      { models: ['IP13PROMAX'], colors: U, price: 9000 },
    ],
  },
  {
    name: 'Lines Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: U, price: 9000 },
      { models: ['IP13', 'IP14'], colors: U, price: 9000 },
      { models: ['IP12', 'IP12PRO'], colors: U, price: 9000 },
      { models: ['IP11'], colors: U, price: 9000 },
      { models: ['IP17PROMAX'], colors: U, price: 9000 },
      { models: ['IP17PRO'], colors: U, price: 9000 },
      { models: ['IP17'], colors: U, price: 9000 },
      { models: ['IP16PROMAX'], colors: U, price: 9000 },
      { models: ['IP16PRO'], colors: U, price: 9000 },
      { models: ['IP16'], colors: U, price: 9000 },
      { models: ['IP15PROMAX'], colors: U, price: 9000 },
      { models: ['IP15PRO'], colors: U, price: 9000 },
      { models: ['IP15'], colors: U, price: 9000 },
      { models: ['IP14PRO'], colors: U, price: 9000 },
      { models: ['IP14PROMAX'], colors: U, price: 9000 },
      { models: ['IP13PROMAX'], colors: U, price: 9000 },
    ],
  },
  {
    name: 'MagCase',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: ['blanco', 'bordo', 'rosa'], price: 8000 },
      { models: ['IP17'], colors: ['bordo'], price: 8000 },
      { models: ['IP16PROMAX'], colors: ['negro', 'bordo', 'rosa pastel'], price: 8000 },
      { models: ['IP16PRO'], colors: ['blanco', 'bordo'], price: 8000 },
      { models: ['IP16'], colors: ['blanco', 'bordo', 'rosa'], price: 8000 },
      { models: ['IP15PROMAX'], colors: ['blanco', 'negro', 'bordo'], price: 8000 },
      { models: ['IP15PRO'], colors: ['blanco', 'negro', 'bordo'], price: 8000 },
      { models: ['IP15'], colors: ['blanco', 'negro', 'rosa'], price: 8000 },
      { models: ['IP14PRO'], colors: ['blanco', 'rosa pastel'], price: 8000 },
      { models: ['IP14PROMAX'], colors: ['blanco', 'negro', 'rosa'], price: 8000 },
      { models: ['IP13PROMAX'], colors: ['blanco', 'bordo', 'rosa'], price: 8000 },
    ],
  },
  {
    name: 'Wave Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: ['bordo', 'rosa'], price: 9000 },
      { models: ['IP13', 'IP14'], colors: ['cherry', 'marrón', 'rosa'], price: 9000 },
      { models: ['IP11'], colors: ['rosa', 'marrón'], price: 9000 },
      { models: ['IP16PROMAX'], colors: ['cherry', 'rosa', 'marrón'], price: 9000 },
      { models: ['IP16PRO'], colors: ['cherry', 'rosa', 'marrón'], price: 9000 },
      { models: ['IP16'], colors: ['cherry', 'marrón'], price: 9000 },
      { models: ['IP15PROMAX'], colors: ['cherry', 'rosa', 'marrón'], price: 9000 },
      { models: ['IP15PRO'], colors: ['cherry', 'rosa', 'marrón'], price: 9000 },
      { models: ['IP15'], colors: ['cherry', 'rosa', 'marrón'], price: 9000 },
      { models: ['IP14PRO'], colors: ['cherry', 'rosa', 'marrón'], price: 9000 },
      { models: ['IP14PROMAX'], colors: ['rosa', 'bordo', 'marrón'], price: 9000 },
      { models: ['IP13PROMAX'], colors: ['cherry', 'rosa', 'beige'], price: 9000 },
    ],
  },
  {
    name: 'Loop Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: U, price: 8800 },
      { models: ['IP13', 'IP14'], colors: U, price: 8800 },
      { models: ['IP11'], colors: U, price: 8800 },
      { models: ['IP16PROMAX'], colors: U, price: 8800 },
      { models: ['IP16PRO'], colors: U, price: 8800 },
      { models: ['IP16'], colors: U, price: 8800 },
      { models: ['IP15PROMAX'], colors: U, price: 8800 },
      { models: ['IP15PRO'], colors: U, price: 8800 },
      { models: ['IP15'], colors: U, price: 8800 },
      { models: ['IP14PROMAX'], colors: U, price: 8800 },
      { models: ['IP13PROMAX'], colors: U, price: 8800 },
    ],
  },
  {
    name: 'Smoky Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: ['gris', 'verde'], price: 8500 },
      { models: ['IP11'], colors: ['gris', 'verde'], price: 8500 },
      { models: ['IP16PROMAX'], colors: ['verde'], price: 8500 },
      { models: ['IP16PRO'], colors: ['gris', 'verde'], price: 8500 },
      { models: ['IP15PROMAX'], colors: ['gris', 'verde'], price: 8500 },
      { models: ['IP15PRO'], colors: ['gris', 'verde'], price: 8500 },
      { models: ['IP15'], colors: ['gris', 'verde'], price: 8500 },
      { models: ['IP14PRO'], colors: ['verde', 'gris'], price: 8500 },
      { models: ['IP14PROMAX'], colors: ['verde'], price: 8500 },
    ],
  },
  {
    name: 'Star Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: ['negro', 'plateado'], price: 8000 },
      { models: ['IP13', 'IP14'], colors: ['negro', 'plateado'], price: 8000 },
      { models: ['IP11'], colors: ['negro'], price: 8000 },
      { models: ['IP16PROMAX'], colors: ['negro', 'plateado'], price: 8000 },
      { models: ['IP16PRO'], colors: ['negro', 'plateado'], price: 8000 },
      { models: ['IP16'], colors: ['negro', 'plateado'], price: 8000 },
      { models: ['IP15PROMAX'], colors: ['negro', 'plateado'], price: 8000 },
      { models: ['IP15PRO'], colors: ['negro', 'plateado'], price: 8000 },
      { models: ['IP15'], colors: ['negro', 'plateado'], price: 8000 },
      { models: ['IP14PRO'], colors: ['negro', 'plateado'], price: 8000 },
    ],
  },
  {
    name: 'Fire Case Mate',
    category: 'De diseño',
    entries: [
      { models: ['IP13PRO'], colors: ['negro', 'plateado'], price: 9999 },
      { models: ['IP12', 'IP12PRO'], colors: ['negro', 'plateado'], price: 9999 },
      { models: ['IP16'], colors: ['plateado'], price: 9999 },
      { models: ['IP15PROMAX'], colors: ['negro', 'plateado'], price: 9999 },
      { models: ['IP15PRO'], colors: ['negro', 'plateado'], price: 9999 },
      { models: ['IP15'], colors: ['negro', 'plateado'], price: 9999 },
      { models: ['IP14PROMAX'], colors: ['negro'], price: 9999 },
      { models: ['IP13PROMAX'], colors: ['negro'], price: 9999 },
    ],
  },
  {
    name: 'Funda Cerecita',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: U, price: 10000 },
      { models: ['IP17PROMAX'], colors: U, price: 10000 },
      { models: ['IP17PRO'], colors: U, price: 10000 },
      { models: ['IP17'], colors: U, price: 10000 },
      { models: ['IP16PROMAX'], colors: U, price: 10000 },
      { models: ['IP16PRO'], colors: U, price: 10000 },
      { models: ['IP16'], colors: U, price: 10000 },
      { models: ['IP15'], colors: U, price: 10000 },
    ],
  },
  {
    name: 'Funda Smile',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: U, price: 10000 },
      { models: ['IP17PROMAX'], colors: U, price: 10000 },
      { models: ['IP17PRO'], colors: U, price: 10000 },
      { models: ['IP17'], colors: U, price: 10000 },
      { models: ['IP16PROMAX'], colors: U, price: 10000 },
      { models: ['IP16PRO'], colors: U, price: 10000 },
      { models: ['IP16'], colors: U, price: 10000 },
      { models: ['IP15'], colors: U, price: 10000 },
    ],
  },
  {
    name: 'Cherry Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: U, price: 8500 },
      { models: ['IP17PROMAX'], colors: U, price: 8500 },
      { models: ['IP17PRO'], colors: U, price: 8500 },
      { models: ['IP17'], colors: U, price: 8500 },
      { models: ['IP16PROMAX'], colors: U, price: 8500 },
      { models: ['IP16PRO'], colors: U, price: 8500 },
      { models: ['IP16'], colors: U, price: 8500 },
      { models: ['IP15'], colors: U, price: 8500 },
    ],
  },
  {
    name: 'Leather Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: U, price: 10500 },
      { models: ['IP16PROMAX'], colors: U, price: 10500 },
      { models: ['IP16PRO'], colors: U, price: 10500 },
      { models: ['IP16'], colors: U, price: 10500 },
      { models: ['IP15PROMAX'], colors: U, price: 10500 },
      { models: ['IP15PRO'], colors: U, price: 10500 },
      { models: ['IP15'], colors: U, price: 10500 },
    ],
  },
  {
    name: 'Gum Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: U, price: 10000 },
      { models: ['IP11'], colors: U, price: 10000 },
      { models: ['IP16PROMAX'], colors: U, price: 10000 },
      { models: ['IP16'], colors: U, price: 10000 },
      { models: ['IP15PROMAX'], colors: U, price: 10000 },
      { models: ['IP15PRO'], colors: U, price: 10000 },
      { models: ['IP15'], colors: U, price: 10000 },
      { models: ['IP14PRO'], colors: U, price: 10000 },
      { models: ['IP14PROMAX'], colors: U, price: 10000 },
    ],
  },
  {
    name: 'Ring Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: U, price: 9999 },
      { models: ['IP16PROMAX'], colors: U, price: 9999 },
      { models: ['IP16PRO'], colors: U, price: 9999 },
      { models: ['IP16'], colors: U, price: 9999 },
      { models: ['IP15PROMAX'], colors: U, price: 9999 },
      { models: ['IP15'], colors: U, price: 9999 },
    ],
  },
  {
    name: 'Shiny Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: U, price: 9000 },
      { models: ['IP16PROMAX'], colors: U, price: 9000 },
      { models: ['IP16PRO'], colors: U, price: 9000 },
      { models: ['IP16'], colors: U, price: 9000 },
      { models: ['IP15PROMAX'], colors: U, price: 9000 },
      { models: ['IP15PRO'], colors: U, price: 9000 },
      { models: ['IP15'], colors: U, price: 9000 },
      { models: ['IP14PROMAX'], colors: U, price: 9000 },
    ],
  },
  {
    name: 'Cowy Case',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: U, price: 8999 },
      { models: ['IP11'], colors: U, price: 8999 },
      { models: ['IP16PROMAX'], colors: U, price: 8999 },
      { models: ['IP16PRO'], colors: U, price: 8999 },
      { models: ['IP15PROMAX'], colors: U, price: 8999 },
      { models: ['IP15PRO'], colors: U, price: 8999 },
      { models: ['IP15'], colors: U, price: 8999 },
      { models: ['IP14PRO'], colors: U, price: 8999 },
      { models: ['IP14PROMAX'], colors: U, price: 8999 },
      { models: ['IP13PROMAX'], colors: U, price: 8999 },
    ],
  },
  {
    name: 'MagMatte',
    category: 'De diseño',
    entries: [
      { models: ['IP13', 'IP14'], colors: ['blanco', 'celeste'], price: 8499 },
      { models: ['IP11'], colors: ['blanco', 'azul', 'celeste'], price: 8499 },
      { models: ['IP16PROMAX'], colors: ['violeta', 'negro', 'celeste'], price: 8499 },
      { models: ['IP16PRO'], colors: ['violeta', 'celeste', 'blanco'], price: 8499 },
      { models: ['IP16'], colors: ['violeta', 'celeste', 'blanco'], price: 8499 },
      { models: ['IP15PROMAX'], colors: ['violeta', 'celeste', 'negro'], price: 8499 },
      { models: ['IP15PRO'], colors: ['violeta', 'celeste', 'negro'], price: 8499 },
      { models: ['IP15'], colors: ['violeta', 'celeste', 'blanco'], price: 8499 },
      { models: ['IP14PROMAX'], colors: ['celeste', 'negro', 'blanco'], price: 8499 },
      { models: ['IP14PRO'], colors: ['violeta', 'rosa'], price: 8499 },
    ],
  },
  {
    name: 'Rave Case',
    category: 'De diseño',
    entries: [
      { models: ['IP12', 'IP12PRO'], colors: ['violeta'], price: 9999 },
      { models: ['IP11'], colors: ['blanco', 'violeta', 'azul'], price: 9999 },
      { models: ['IP17PROMAX'], colors: ['blanco', 'negro'], price: 10000 },
      { models: ['IP17PRO'], colors: ['negro', 'blanco'], price: 10000 },
      { models: ['IP17'], colors: ['negro'], price: 10000 },
      { models: ['IP16PROMAX'], colors: ['blanco', 'violeta', 'rosa'], price: 9999 },
      { models: ['IP16PRO'], colors: ['negro', 'violeta'], price: 9999 },
      { models: ['IP16'], colors: ['negro', 'blanco', 'violeta'], price: 9999 },
      { models: ['IP15PROMAX'], colors: ['blanco', 'negro'], price: 9999 },
      { models: ['IP15'], colors: ['blanco', 'violeta'], price: 9999 },
    ],
  },
  {
    name: 'Metal Case',
    category: 'De diseño',
    entries: [
      { models: ['IP17PROMAX'], colors: U, price: 15000 },
      { models: ['IP17PRO'], colors: U, price: 15000 },
      { models: ['IP17', 'IPAIR'], colors: U, price: 15000 },
      { models: ['IP17'], colors: U, price: 15000 },
    ],
  },
  {
    name: 'Print Case',
    category: 'De diseño',
    entries: [
      { models: ['IP17'], colors: U, price: 9000 },
      { models: ['IP16PROMAX'], colors: U, price: 9000 },
      { models: ['IP16PRO'], colors: U, price: 9000 },
      { models: ['IP16'], colors: U, price: 9000 },
      { models: ['IP15PROMAX'], colors: U, price: 9000 },
      { models: ['IP14PRO'], colors: U, price: 9000 },
      { models: ['IP14PROMAX'], colors: U, price: 9000 },
      { models: ['IP13PROMAX'], colors: U, price: 9000 },
    ],
  },
  {
    name: 'Road Case',
    category: 'De diseño',
    entries: [{ models: ['IP16PRO'], colors: U, price: 5500 }],
  },
  {
    // Confirmado con el dueño: es una funda de silicona con correa incluida,
    // con nombre propio -- mismo criterio que "Road Case", no "Accesorios".
    name: 'MagSafe Silicona Correa',
    category: 'De diseño',
    entries: [{ models: ['IP15PROMAX'], colors: U, price: 5500 }],
  },

  // ------------------------------------------------------------ Transparentes --
  {
    name: 'Transparente Reforzada',
    category: 'Transparentes',
    entries: [
      { models: ['IP13PRO'], colors: U, price: 4000 },
      { models: ['IP13', 'IP14'], colors: U, price: 4000 },
      { models: ['IP12PROMAX'], colors: U, price: 4000 },
      { models: ['IP12', 'IP12PRO'], colors: U, price: 4000 },
      { models: ['IP11PRO'], colors: U, price: 4000 },
      { models: ['IP11'], colors: U, price: 4000 },
      { models: ['IP11PROMAX'], colors: U, price: 4000 },
      { models: ['IP17PROMAX'], colors: U, price: 4000 },
      { models: ['IP17PRO'], colors: U, price: 4000 },
      { models: ['IP17', 'IPAIR'], colors: U, price: 4000 },
      { models: ['IP17'], colors: U, price: 4000 },
      { models: ['IP16PROMAX'], colors: U, price: 4000 },
      { models: ['IP16PRO'], colors: U, price: 4000 },
      { models: ['IP16'], colors: U, price: 4000 },
      { models: ['IP15PROMAX'], colors: U, price: 4000 },
      { models: ['IP15PRO'], colors: U, price: 4000 },
      { models: ['IP15'], colors: U, price: 4000 },
      { models: ['IP14PROMAX'], colors: U, price: 4000 },
      { models: ['IP13PROMAX'], colors: U, price: 4000 },
    ],
  },
  {
    name: 'Transparente MagSafe',
    category: 'Transparentes',
    entries: [
      { models: ['IP13PRO'], colors: U, price: 7000 },
      { models: ['IP13', 'IP14'], colors: U, price: 7000 },
      { models: ['IP12PROMAX'], colors: U, price: 7000 },
      { models: ['IP12', 'IP12PRO'], colors: U, price: 7000 },
      { models: ['IP17PROMAX'], colors: U, price: 6500 },
      { models: ['IP17PRO'], colors: U, price: 7000 },
      { models: ['IP17', 'IPAIR'], colors: U, price: 6500 },
      { models: ['IP17'], colors: U, price: 6500 },
      { models: ['IP16PROMAX'], colors: U, price: 7000 },
      { models: ['IP16PRO'], colors: U, price: 7000 },
      { models: ['IP16'], colors: U, price: 7000 },
      { models: ['IP15PROMAX'], colors: U, price: 7000 },
      { models: ['IP15PRO'], colors: U, price: 7000 },
      { models: ['IP15'], colors: U, price: 7000 },
      { models: ['IP14PROMAX'], colors: U, price: 7000 },
      { models: ['IP13PROMAX'], colors: U, price: 7000 },
    ],
  },
  {
    name: 'Glitter Case',
    category: 'Transparentes',
    entries: [
      { models: ['IP12', 'IP12PRO'], colors: U, price: 5499 },
      { models: ['IP15PROMAX'], colors: U, price: 5499 },
      { models: ['IP15PRO'], colors: U, price: 5499 },
      { models: ['IP15'], colors: U, price: 5499 },
      { models: ['IP14PRO'], colors: U, price: 5499 },
      { models: ['IP14PROMAX'], colors: U, price: 5499 },
    ],
  },
  {
    name: 'Cute Case',
    category: 'Transparentes',
    entries: [
      { models: ['IP15PROMAX'], colors: U, price: 8000 },
      { models: ['IP15PRO'], colors: U, price: 8000 },
      { models: ['IP14PRO'], colors: U, price: 8000 },
      { models: ['IP14PROMAX'], colors: U, price: 8000 },
    ],
  },

  // ------------------------------------------------------------ De silicona --
  {
    name: 'Silicona',
    category: 'De silicona',
    entries: [
      // iPhone 13 Pro
      { models: ['IP13PRO'], colors: ['vinotinto', 'marrón', 'azul marino', 'rosa', 'verde agua', 'morada', 'negra'], price: 6500 },
      // iPhone 14 Pro
      { models: ['IP14PRO'], colors: ['vinotinto', 'verde', 'azul', 'violeta', 'blanca', 'negra', 'rosa'], price: 6500 },
      // iPhone 13 / 14
      { models: ['IP13', 'IP14'], colors: ['lila', 'rosa', 'marrón', 'gris oscuro', 'azul petróleo', 'púrpura'], price: 6500 },
      // iPhone 12 Pro Max
      { models: ['IP12PROMAX'], colors: ['magenta', 'celeste pastel', 'verde plomo', 'negra', 'blanca'], price: 6500 },
      // iPhone 12 / 12 Pro
      { models: ['IP12', 'IP12PRO'], colors: ['violeta', 'negro', 'beige', 'vinotinto', 'gris', 'marrón'], price: 6500 },
      // iPhone 11 Pro
      { models: ['IP11PRO'], colors: ['violeta', 'negra', 'blanca', 'azul'], price: 6500 },
      // iPhone 11
      { models: ['IP11'], colors: ['marrón claro', 'vinotinto', 'celeste pastel', 'verde oscuro', 'negra'], price: 6500 },
      // iPhone 11 Pro Max
      { models: ['IP11PROMAX'], colors: ['blanca', 'marrón', 'negra'], price: 6500 },
      // iPhone 17 Pro Max ("Silicone Case" en el catálogo = misma línea Silicona)
      { models: ['IP17PROMAX'], colors: ['rosa viejo', 'azul marino', 'blanca', 'negra'], price: 8800 },
      // iPhone 17 Pro
      { models: ['IP17PRO'], colors: ['gris', 'celeste pastel', 'marrón', 'negra', 'lila'], price: 8800 },
      // iPhone 17 / Air
      { models: ['IP17', 'IPAIR'], colors: ['vinotinto', 'celeste pastel', 'negra', 'rosa viejo', 'blanca'], price: 8800 },
      // iPhone 17
      { models: ['IP17'], colors: ['azul marino', 'celeste pastel', 'vinotinto', 'rosa', 'marrón', 'blanca', 'negra'], price: 8800 },
      // iPhone 16 Pro Max
      { models: ['IP16PROMAX'], colors: ['celeste', 'marrón', 'vinotinto', 'verde oscuro', 'negra', 'azul marino', 'rosa viejo', 'blanca'], price: 6500 },
      // iPhone 16 Pro
      { models: ['IP16PRO'], colors: ['rosa', 'verde oscuro', 'verde pastel', 'negra', 'lila', 'blanca', 'magenta', 'azul marino', 'marrón'], price: 6500 },
      // iPhone 16
      { models: ['IP16'], colors: ['bordo', 'azul oscuro', 'marrón', 'rosa pastel', 'morada', 'celeste pastel', 'lila'], price: 6500 },
      // iPhone 15 Pro Max
      { models: ['IP15PROMAX'], colors: ['magenta', 'celeste pastel', 'azul marino', 'verde plomo', 'negra', 'rosa pastel', 'violeta', 'gris oscuro', 'marrón', 'morada'], price: 6500 },
      // iPhone 15 Pro
      { models: ['IP15PRO'], colors: ['violeta', 'rosa pastel', 'rosa viejo', 'gris', 'verde plomo', 'lila', 'verde agua', 'blanca', 'negro'], price: 6500 },
      // iPhone 15
      { models: ['IP15'], colors: ['rosa', 'crema', 'violeta', 'lila', 'marrón', 'blanca', 'negra'], price: 6500 },
      // iPhone 14 Pro Max
      { models: ['IP14PROMAX'], colors: ['magenta', 'amarillo pastel', 'lila', 'negra', 'blanca', 'celeste pastel'], price: 6500 },
      // iPhone 13 Pro Max
      { models: ['IP13PROMAX'], colors: ['rosa viejo', 'celeste pastel', 'beige', 'verde pastel', 'blanca', 'morada'], price: 6500 },
    ],
  },

  // ------------------------------------------------------------ Cargadores y cables --
  {
    name: 'Cabezal 20W Apple Certificado',
    category: 'Cargadores y cables',
    entries: [{ models: null, colors: U, price: 13000 }],
  },
  {
    name: 'Cables Certificados Apple',
    category: 'Cargadores y cables',
    entries: [{ models: null, colors: ['Tipo C a Lightning'], price: 7000 }],
  },
  {
    name: 'Funda Cargador + Comecable',
    category: 'Cargadores y cables',
    entries: [
      { models: null, colors: ['BOB', 'BATMAN', 'CAP AMÉRICA', 'IRON MAN'], price: 6500 },
    ],
  },
  {
    name: 'Funda cargador + comecables',
    category: 'Cargadores y cables',
    entries: [{ models: null, colors: ['rosa', 'cereza'], price: 7000 }],
  },
  {
    name: 'COMBO Funda + Funda Cargador',
    category: 'Cargadores y cables',
    entries: [{ models: null, colors: ['rosa', 'cereza'], price: 15000 }],
  },
  {
    name: 'Funda Cargador STRASS',
    category: 'Cargadores y cables',
    entries: [{ models: null, colors: U, price: 7500 }],
  },

  // ------------------------------------------------------------ Accesorios --
  {
    name: 'AirPods Pro 2da Generación',
    category: 'Accesorios',
    entries: [{ models: null, colors: U, price: 40000 }],
  },
  {
    name: 'Straps/Correas perlas',
    category: 'Accesorios',
    entries: [{ models: null, colors: U, price: 5000 }],
  },
  {
    name: 'Soporte Ventosa Doble',
    category: 'Accesorios',
    entries: [{ models: null, colors: U, price: 3500 }],
  },
  // *** SUPUESTO (texto truncado en el PDF): ver aviso final ***
  {
    name: 'Vidrio templado Anti Espía',
    category: 'Accesorios',
    entries: [{ models: ALL_EXCEPT_AIR, colors: U, price: 5000 }],
  },
  {
    name: 'Vidrio templado 9D/SD',
    category: 'Accesorios',
    entries: [{ models: ALL_EXCEPT_AIR, colors: U, price: 4000 }],
  },
  {
    name: 'Lentes de cámara metalizados',
    category: 'Accesorios',
    entries: [{ models: ALL_EXCEPT_AIR, colors: U, price: 3000 }],
  },
  // Depende del modelo (el lente calza sobre el módulo de cámara específico):
  // mismo rango asumido que "metalizados", texto del PDF no traía el rango
  // propio para este ítem puntual.
  {
    name: 'Lentes de cámara con Glitter',
    category: 'Accesorios',
    entries: [{ models: ALL_EXCEPT_AIR, colors: ['plateado', 'negro', 'dorado'], price: 3000 }],
  },
];

// ---------------------------------------------------------------------------

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function codeOf(name: string, maxLen = 10): string {
  return stripAccents(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, maxLen);
}

function colorCode(color: string): string {
  if (color === 'Único') return 'UNICO';
  return codeOf(color, 6);
}

async function getCategoryId(name: string): Promise<string> {
  const { data, error } = await supabase.from('categories').select('id').eq('name', name).single();
  if (error || !data) throw new Error(`Categoría no encontrada: ${name} (${error?.message})`);
  return data.id;
}

async function getModelId(realName: string): Promise<string> {
  const { data, error } = await supabase.from('iphone_models').select('id').eq('name', realName).single();
  if (error || !data) throw new Error(`Modelo no encontrado: ${realName} (${error?.message})`);
  return data.id;
}

async function getOrCreateProduct(name: string, categoryId: string): Promise<{ id: string; created: boolean }> {
  // Busca por nombre solo (no por nombre+categoría): así, si la categoría de
  // un producto cambia entre corridas, la corrección actualiza la fila
  // existente en vez de crear un duplicado en la categoría nueva.
  const { data: existing, error: selErr } = await supabase
    .from('products')
    .select('id, category_id')
    .eq('name', name)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    if (existing.category_id !== categoryId) {
      const { error: updErr } = await supabase
        .from('products')
        .update({ category_id: categoryId })
        .eq('id', existing.id);
      if (updErr) throw new Error(`No se pudo actualizar la categoría de "${name}": ${updErr.message}`);
    }
    return { id: existing.id, created: false };
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ category_id: categoryId, name, active: true })
    .select('id')
    .single();
  if (error || !data) throw new Error(`No se pudo crear el producto "${name}": ${error?.message}`);
  return { id: data.id, created: true };
}

type VariantRow = {
  product_id: string;
  iphone_model_id: string | null;
  color: string | null;
  sku: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  active: boolean;
};

async function main() {
  const categoryIds = new Map<string, string>();
  for (const catName of ['Transparentes', 'De diseño', 'De silicona', 'Cargadores y cables', 'Accesorios']) {
    categoryIds.set(catName, await getCategoryId(catName));
  }

  const modelIds = new Map<string, string>();
  for (const [code, realName] of Object.entries(MODEL_NAME)) {
    modelIds.set(code, await getModelId(realName));
  }

  let productsCreated = 0;
  let productsReused = 0;
  const variantRows: VariantRow[] = [];
  const skuSeen = new Set<string>();
  const examples: string[] = [];

  for (const productDef of products) {
    const categoryId = categoryIds.get(productDef.category);
    if (!categoryId) throw new Error(`Categoría desconocida: ${productDef.category}`);

    const { id: productId, created } = await getOrCreateProduct(productDef.name, categoryId);
    if (created) productsCreated++;
    else productsReused++;

    // Corrección puntual: "Lentes de cámara con Glitter" se había cargado como
    // universal (iphone_model_id null) por error; ahora es por modelo. Se
    // borra la variante vieja para no dejarla huérfana con un SKU que ya no
    // generamos más.
    if (productDef.name === 'Lentes de cámara con Glitter') {
      const { error: delErr } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId)
        .is('iphone_model_id', null);
      if (delErr) throw new Error(`No se pudo limpiar la variante universal vieja: ${delErr.message}`);
    }

    const productCode = codeOf(productDef.name);
    const seenForProduct = new Map<string, true>(); // model|color -> visto (evita duplicar por overlap de páginas)

    for (const entry of productDef.entries) {
      const modelCodes = entry.models ?? [null];
      for (const modelCode of modelCodes) {
        const modelId = modelCode ? modelIds.get(modelCode)! : null;
        const modelTag = modelCode ?? 'UNIV';

        for (const color of entry.colors) {
          const key = `${modelTag}|${color}`;
          if (seenForProduct.has(key)) continue; // ya cargado con otro precio idéntico en otra página
          seenForProduct.set(key, true);

          let sku = `${productCode}-${modelTag}-${colorCode(color)}`;
          let n = 2;
          while (skuSeen.has(sku)) {
            sku = `${productCode}-${modelTag}-${colorCode(color)}-${n}`;
            n++;
          }
          skuSeen.add(sku);

          variantRows.push({
            product_id: productId,
            iphone_model_id: modelId,
            color: color === 'Único' ? null : color,
            sku,
            price: entry.price,
            cost_price: 0,
            stock_quantity: 0,
            active: true,
          });

          if (examples.length < 12 && Math.random() < 0.25) {
            examples.push(
              `${productDef.name} | ${modelCode ? MODEL_NAME[modelCode] : 'universal'} | ${color} | $${entry.price} | SKU ${sku}`,
            );
          }
        }
      }
    }
  }

  console.log(`Productos: ${productsCreated} creados, ${productsReused} ya existían (reusados).`);
  console.log(`Variantes a upsertear: ${variantRows.length}`);

  const chunkSize = 200;
  let upserted = 0;
  for (let i = 0; i < variantRows.length; i += chunkSize) {
    const chunk = variantRows.slice(i, i + chunkSize);
    const { error, count } = await supabase
      .from('product_variants')
      .upsert(chunk, { onConflict: 'sku', count: 'exact' });
    if (error) throw new Error(`Error en upsert de variantes: ${error.message}`);
    upserted += count ?? chunk.length;
  }

  console.log(`Variantes upserteadas: ${upserted}`);
  console.log('\nEjemplos:');
  for (const ex of examples) console.log(' - ' + ex);
}

main()
  .then(() => {
    console.log('\nImport finalizado OK.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('FALLÓ el import:', err);
    process.exit(1);
  });
