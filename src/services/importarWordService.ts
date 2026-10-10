// Sube un Word (.docx) y lo analiza en el propio celular (sin servidor ni IA)
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import JSZip from 'jszip';
import { AnalisisDocx, analizarDocx, ImagenExtraida } from '../utils/analizarDocx';

const guardarImagen = (img: ImagenExtraida): string => {
  const destino = new File(Paths.document, `logo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${img.extension}`);
  destino.write(img.base64, { encoding: 'base64' });
  return destino.uri;
};

export const importarWordService = {
  /** Abre el selector de archivos; null si el docente cancela */
  async elegirYAnalizar(): Promise<{ nombre: string; analisis: AnalisisDocx } | null> {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return null;

    const archivo = res.assets[0];
    if (!/\.docx$/i.test(archivo.name)) {
      throw new Error('Elige un archivo de Word (.docx). Los .doc antiguos y los PDF todavía no se pueden analizar.');
    }

    const zip = await JSZip.loadAsync(await new File(archivo.uri).base64(), { base64: true });
    const analisis = await analizarDocx({
      texto: async (ruta) => (await zip.file(ruta)?.async('string')) ?? null,
      base64: async (ruta) => (await zip.file(ruta)?.async('base64')) ?? null,
    });

    // Los logos del encabezado se guardan en la carpeta de la app para reutilizarlos
    const { izquierda, derecha } = analisis.imagenes;
    if (izquierda) analisis.definicion.cabecera.logoIzquierdo = guardarImagen(izquierda);
    if (derecha) analisis.definicion.cabecera.logoDerecho = guardarImagen(derecha);

    return { nombre: archivo.name.replace(/\.docx$/i, ''), analisis };
  },
};
