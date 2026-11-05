"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type Ref } from "react";

/**
 * Igual que next/image, con un respaldo: si el optimizador de Vercel falla (por
 * ejemplo con un 402 cuando se agota el cupo del plan), la foto se vuelve a
 * pedir tal cual está guardada, sin optimizar. Pesa más, pero se ve. Mientras
 * el optimizador responde, todo sigue funcionando como siempre.
 */
export default function SafeImage({
  alt,
  onError,
  unoptimized,
  ref,
  ...props
}: ImageProps & { ref?: Ref<HTMLImageElement> }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      {...props}
      ref={ref}
      alt={alt}
      unoptimized={unoptimized || failed}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
