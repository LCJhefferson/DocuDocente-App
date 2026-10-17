import { File } from 'expo-file-system';
import { rutaLocalLogo } from './logos';

export type ImagenWord = { data: Uint8Array; tipo: 'png' | 'jpg'; ancho: number; alto: number };

const entero16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];

/**
 * Lee el tipo, el ancho y el alto de una imagen PNG o JPEG mirando sus primeros bytes.
 * Word necesita el tamaño para poner la imagen sin deformarla.
 */
export const dimensionesImagen = (b: Uint8Array): Omit<ImagenWord, 'data'> | null => {
  // PNG: el ancho y el alto están en el bloque IHDR (bytes 16 a 23)
  if (b[0] === 0x89 && b[1] === 0x50) {
    const ancho = ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0;
    const alto = ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0;
    return { tipo: 'png', ancho, alto };
  }
  // JPEG: se recorren los bloques hasta encontrar el que guarda el tamaño (SOF)
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marcador = b[i + 1];
      const esSOF = marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;
      if (esSOF) return { tipo: 'jpg', alto: entero16(b, i + 5), ancho: entero16(b, i + 7) };
      i += 2 + entero16(b, i + 2);
    }
  }
  return null;
};

/** Lee un logo ('untrm', 'fisme') o una foto del celular y la deja lista para ponerla en el Word */
export const leerImagenWord = async (logoOUri: string | null): Promise<ImagenWord | null> => {
  if (!logoOUri) return null;
  try {
    const uri = await rutaLocalLogo(logoOUri);
    if (!uri) return null;
    const data = await new File(uri).bytes();
    const medidas = dimensionesImagen(data);
    return medidas ? { data, ...medidas } : null;
  } catch {
    return null; // la imagen se borró del celular: se omite sin romper el informe
  }
};

/** Achica la imagen para que entre en el espacio indicado (en píxeles), sin agrandarla ni deformarla */
export const ajustarImagen = (imagen: ImagenWord, anchoMaximo: number, altoMaximo: number) => {
  const escala = Math.min(anchoMaximo / imagen.ancho, altoMaximo / imagen.alto, 1);
  return { width: Math.round(imagen.ancho * escala), height: Math.round(imagen.alto * escala) };
};