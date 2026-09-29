import React from 'react';
/** Logo oficial "La fun dita." — siempre la imagen, nunca redibujado. crop=true recorta el aire negro del JPG para que la marca se lea a tamaños chicos (header). */
export function Logo({ size = 44, src = 'assets/logo-black.jpg', variant = 'black', alt = 'La Fundita', crop = false, style }) {
  const file = variant === 'transparent' && src === 'assets/logo-black.jpg' ? 'assets/logo-transparent.png' : src;
  if (crop) {
    // La marca ocupa ~42% x 48% del cuadrado (centro ≈ 54%, 52%). Caja 7:8 a su alrededor.
    const w = size * 0.875, img = size / 0.5;
    return (
      <span role="img" aria-label={alt} style={{ display: 'block', position: 'relative', width: w, height: size, overflow: 'hidden', flexShrink: 0, ...style }}>
        <img src={file} alt="" width={img} height={img} style={{ position: 'absolute', width: img, height: img, maxWidth: 'none', left: w / 2 - img * 0.54, top: size / 2 - img * 0.518 }} />
      </span>
    );
  }
  return <img src={file} alt={alt} width={size} height={size} style={{ display: 'block', width: size, height: size, ...style }} />;
}
