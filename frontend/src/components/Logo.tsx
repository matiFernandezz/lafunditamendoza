import Image from "next/image";

/**
 * Logo oficial "La fun dita.": siempre la imagen, nunca redibujado.
 * Recorta el aire negro del JPG para que la marca se lea a tamaño de header:
 * en logo-black.jpg la marca ocupa ~42% × 48% del cuadrado, con centro en
 * (54%, 52%), así que se muestra una caja 7:8 alrededor de ese centro.
 */
export default function Logo({ size }: { size: number }) {
  const boxWidth = size * 0.875;
  const imageSize = size * 2;

  return (
    <span
      role="img"
      aria-label="La Fundita"
      className="relative block shrink-0 overflow-hidden"
      style={{ width: boxWidth, height: size }}
    >
      <Image
        src="/brand/logo-black.jpg"
        alt=""
        width={imageSize}
        height={imageSize}
        priority
        className="absolute max-w-none"
        style={{
          width: imageSize,
          height: imageSize,
          left: boxWidth / 2 - imageSize * 0.54,
          top: size / 2 - imageSize * 0.518,
        }}
      />
    </span>
  );
}
