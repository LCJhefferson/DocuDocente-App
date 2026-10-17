import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

// Las fotos del celular pesan varios MB: se reducen para que la app y los informes no se pongan pesados
const enKB = (uri: string) => Math.round(new File(uri).size / 1024);

const ANCHO_MAXIMO = 1280; // píxeles: suficiente para verse bien en un informe
const CALIDAD_JPEG = 0.6; // 0 = máxima compresión, 1 = sin compresión

/**
 * Devuelve la ruta de una copia más liviana de la imagen (JPEG, máx. 1280 px de ancho).
 * Si algo falla, devuelve la imagen original para no bloquear al docente.
 */
export const comprimirImagen = async (uri: string, anchoOriginal?: number): Promise<string> => {
  try {
    const contexto = ImageManipulator.ImageManipulator.manipulate(uri);
    // Solo se achica si es más ancha que el máximo (nunca se agranda); el alto se ajusta solo
    if (!anchoOriginal || anchoOriginal > ANCHO_MAXIMO) {
      contexto.resize({ width: ANCHO_MAXIMO });
    }
    const imagen = await contexto.renderAsync();
    const resultado = await imagen.saveAsync({ compress: CALIDAD_JPEG, format: ImageManipulator.SaveFormat.JPEG });
    console.log(`[comprimirImagen] ${enKB(uri)} KB → ${enKB(resultado.uri)} KB`);
    return resultado.uri;
  } catch (error) {
    console.error('[comprimirImagen] No se pudo reducir la imagen, se usa la original:', error);
    return uri;
  }
};