// Detecta nombres iguales o muy parecidos, para avisar antes de crear un color
// o un motivo repetido ("Celeste" / "celeste", "Bordo" / "Bordó", "Rosas" /
// "Rosa", "Violeta" / "Voileta"). Sin React ni imports: lo prueba un script.

/** Minúsculas, sin tildes y sin nada que no sea letra o número. */
export function foldName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Distancia de edición (inserciones, borrados, cambios y letras cruzadas). */
function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => [i, ...new Array<number>(cols - 1).fill(0)]);
  for (let j = 1; j < cols; j += 1) d[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * "exact": es el mismo nombre (solo cambian mayúsculas, tildes o espacios); la
 * base no deja crear otro. "close": se parece mucho (una letra de diferencia,
 * o dos en nombres largos, o un plural). null: no se parecen.
 */
export function similarity(a: string, b: string): "exact" | "close" | null {
  const x = foldName(a);
  const y = foldName(b);
  if (x === "" || y === "") return null;
  if (x === y) return "exact";
  if (x === `${y}s` || y === `${x}s`) return "close";
  // En nombres cortos una letra cambia todo (Rojo / Rosa): no se avisa.
  const shortest = Math.min(x.length, y.length);
  if (shortest < 5) return null;
  return distance(x, y) <= (shortest >= 9 ? 2 : 1) ? "close" : null;
}

/** El existente que más se parece a `name`: primero uno exacto, después uno cercano. */
export function findSimilar<T extends { name: string }>(
  name: string,
  existing: T[],
): { item: T; kind: "exact" | "close" } | null {
  let close: T | null = null;
  for (const item of existing) {
    const kind = similarity(name, item.name);
    if (kind === "exact") return { item, kind };
    if (kind === "close") close ??= item;
  }
  return close ? { item: close, kind: "close" } : null;
}
