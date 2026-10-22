// Recorte de la foto de una funda para "Nuevos ingresos" (el teléfono que gira):
// saca el fondo liso y calcula el color del canto. Corre en el navegador con
// un canvas, sin librerías ni servicios. Es el mismo método del diseño: un
// relleno desde los bordes que borra los píxeles parecidos al fondo
// (tolerancia 14), y después recorta al contorno de la funda.

const TOLERANCE = 14;

export type Cutout = {
  /** PNG sin fondo, recortado al contorno. */
  blob: Blob;
  /** Para mostrarlo antes de guardarlo (liberar con URL.revokeObjectURL). */
  previewUrl: string;
  /** Color del marco de la funda, en hex. */
  edgeColor: string;
};

const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

async function loadBitmap(source: string | Blob): Promise<ImageBitmap> {
  if (typeof source !== "string") return createImageBitmap(source);
  const res = await fetch(source, { mode: "cors" });
  if (!res.ok) throw new Error("No se pudo abrir la foto.");
  return createImageBitmap(await res.blob());
}

/** Recorta la foto (una URL de la tienda o un archivo elegido). */
export async function makeCutout(source: string | Blob): Promise<Cutout> {
  const bitmap = await loadBitmap(source);
  const { width: w, height: h } = bitmap;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("El navegador no permite editar la foto.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  const at = (x: number, y: number) => (y * w + x) * 4;

  // ¿Ya viene sin fondo? (esquinas transparentes): solo se recorta al contorno.
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const alreadyCut = corners.every((i) => px[i + 3] < 16);

  if (!alreadyCut) {
    // Color del fondo: el promedio de las cuatro esquinas.
    const bg = [0, 1, 2].map((c) => corners.reduce((sum, i) => sum + px[i + c], 0) / corners.length);
    const isBackground = (i: number) =>
      Math.abs(px[i] - bg[0]) <= TOLERANCE &&
      Math.abs(px[i + 1] - bg[1]) <= TOLERANCE &&
      Math.abs(px[i + 2] - bg[2]) <= TOLERANCE;

    // Relleno desde todo el borde: solo se borra el fondo conectado con el
    // exterior (un blanco adentro de la funda no se toca).
    const seen = new Uint8Array(w * h);
    const stack: number[] = [];
    const push = (x: number, y: number) => {
      const p = y * w + x;
      if (seen[p]) return;
      seen[p] = 1;
      if (isBackground(p * 4)) stack.push(p);
    };
    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }
    while (stack.length > 0) {
      const p = stack.pop()!;
      px[p * 4 + 3] = 0;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }
  }

  // Contorno: lo que quedó opaco.
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[at(x, y) + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("No se encontró la funda en la foto: ¿el fondo es liso?");

  // Canto: el color del marco, unos píxeles hacia adentro desde el borde
  // izquierdo y derecho, en la franja del medio (lejos de la cámara).
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = Math.round(minY + (maxY - minY) * 0.35); y <= minY + (maxY - minY) * 0.75; y += 2) {
    let left = -1;
    for (let x = minX; x <= maxX; x++) if (px[at(x, y) + 3] > 200) { left = x; break; }
    let right = -1;
    for (let x = maxX; x >= minX; x--) if (px[at(x, y) + 3] > 200) { right = x; break; }
    for (const x of [left + 3, right - 3]) {
      if (left < 0 || x < minX || x > maxX) continue;
      const i = at(x, y);
      if (px[i + 3] < 200) continue;
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
      n += 1;
    }
  }
  const edgeColor = n > 0 ? hex(r / n, g / n, b / n) : "#121212";

  ctx.putImageData(image, 0, 0);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob((result) => (result ? resolve(result) : reject(new Error("No se pudo armar el recorte."))), "image/png"),
  );
  return { blob, previewUrl: URL.createObjectURL(blob), edgeColor };
}
