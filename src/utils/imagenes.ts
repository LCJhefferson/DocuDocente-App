import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const ANCHO_MAXIMO = 1280; // píxeles: resolución óptima para informes impresos y PDF
const CALIDAD_JPEG = 0.6; // Compresión del 60%: excelente equilibrio entre peso y calidad visual

/**
 * Devuelve la ruta de una copia liviana de la imagen en formato JPEG.
 * Si ocurre un error, retorna la URI original para no bloquear la experiencia del docente.
 */
export const comprimirImagen = async (uri: string, anchoOriginal?: number): Promise<string> => {
  try {
    const acciones: ImageManipulator.Action[] = [];

    // Redimensionar solo si la imagen supera el ancho máximo
    if (!anchoOriginal || anchoOriginal > ANCHO_MAXIMO) {
      acciones.push({ resize: { width: ANCHO_MAXIMO } });
    }

    const resultado = await ImageManipulator.manipulateAsync(
      uri,
      acciones,
      { compress: CALIDAD_JPEG, format: ImageManipulator.SaveFormat.JPEG }
    );

    return resultado.uri;
  } catch (error) {
    console.error('[comprimirImagen] No se pudo reducir la imagen, se usará la original:', error);
    return uri;
  }
};

/**
 * Convierte una imagen (sea una ruta física local 'file://' o una URL remota 'https://')
 * a una cadena Base64 lista para ser renderizada en plantillas PDF o incrustada en Word (.docx).
 */
export async function obtenerBase64DeImagen(
  rutaLocal?: string | null,
  urlRemota?: string | null
): Promise<string | null> {
  try {
    // 1. Prioridad: Intentar leer el archivo guardado localmente en el celular
    if (rutaLocal) {
      const fileInfo = await FileSystem.getInfoAsync(rutaLocal);
      if (fileInfo.exists) {
        const base64 = await FileSystem.readAsStringAsync(rutaLocal, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/jpeg;base64,${base64}`;
      }
    }

    // 2. Respaldo: Si no está en almacenamiento local pero existe una URL pública en la nube
    if (urlRemota) {
      const response = await fetch(urlRemota);
      const blob = await response.blob();

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }

    return null;
  } catch (error) {
    console.error('[obtenerBase64DeImagen Error]:', error);
    return null;
  }
}