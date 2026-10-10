import { File } from 'expo-file-system';
import { rutaLocalLogo } from './logos';

// Evita que un texto escrito por el docente (ej: "<b>") rompa el HTML del PDF
export const escapar = (texto: string | null | undefined) =>
  (texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// expo-print no puede leer fotos del celular por su ruta: hay que incrustarlas en base64
export const imagenEnBase64 = async (logoOUri: string | null): Promise<string | null> => {
  if (!logoOUri) return null;
  try {
    const uri = await rutaLocalLogo(logoOUri); // 'untrm' / 'fisme' -> archivo incluido en la app
    if (!uri) return null;
    const base64 = await new File(uri).base64();
    return `data:image/${uri.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'};base64,${base64}`;
  } catch {
    return null; // la imagen se borró del celular -> se omite sin romper el informe
  }
};
