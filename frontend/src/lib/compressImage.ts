// Achica y recomprime una foto en el navegador, antes de subirla a Storage.
//
// La tienda sirve las fotos tal cual están guardadas (sin el optimizador de
// imágenes de Vercel, que tiene cupo y se bloquea al agotarlo), así que el peso
// que se sube es el que descarga cada cliente. Una foto de celular o un PNG de
// diseño puede pesar 3 MB; en WebP y a 2000 px de lado queda en unos 100-300 KB,
// sin diferencia visible, y conserva la transparencia de los PNG sin fondo.

const MAX_SIDE = 2000;
const QUALITY = 0.85;

/**
 * Devuelve la foto achicada (lado mayor de hasta 2000 px) y en WebP. Si el
 * navegador no puede (sin soporte de WebP, formato raro) o el resultado no
 * pesa menos, devuelve la original sin tocar: subir nunca falla por esto.
 */
export async function compressImage(file: File, maxSide = MAX_SIDE): Promise<File> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    // Un navegador sin WebP devuelve PNG: no sirve. Tampoco si no mejora el peso.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}
