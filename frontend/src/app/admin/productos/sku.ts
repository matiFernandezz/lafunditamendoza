const STOP_WORDS = new Set(["de", "del", "la", "el", "los", "las", "para", "con", "y", "en", "un", "una"]);

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function ascii(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "");
}

// "Funda de silicona degradé" -> "FSD"
function productCode(name: string): string {
  return ascii(name)
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w !== "" && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 4)
    .map((w) => w[0])
    .join("");
}

// "iPhone 14 Pro Max" -> "14PM", "iPhone Air" -> "AIR"
function modelCode(name: string): string {
  const parts = ascii(name.replace(/^iphone\s*/i, ""))
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  const [first, ...rest] = parts;
  return /^\d+$/.test(first) ? first + rest.map((p) => p[0]).join("") : parts.join("").slice(0, 4);
}

// "rojo" -> "ROJ"
function colorCode(color: string): string {
  return ascii(color).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
}

/** SKU sugerido a partir de producto + modelo + color (el usuario lo puede editar). */
export function suggestSku(productName: string, modelName: string, color: string): string {
  return [productCode(productName), modelCode(modelName), colorCode(color)]
    .filter(Boolean)
    .join("-");
}
