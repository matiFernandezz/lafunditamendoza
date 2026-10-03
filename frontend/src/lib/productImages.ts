// Reglas de las fotos de producto, compartidas entre el navegador (valida
// antes de subir) y el servidor (valida antes de firmar la subida).

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB: fotos de celular, no profesionales.
export const MAX_PRODUCT_IMAGE_SIZE_MB = MAX_PRODUCT_IMAGE_SIZE / (1024 * 1024);

export const PRODUCT_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const PRODUCT_IMAGE_TYPES = Object.keys(PRODUCT_IMAGE_EXTENSIONS);
