import { Packer } from 'docx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { definicionDelCatalogo } from '../data/catalogoPlantillas';
import { InformeCompleto } from '../models/Informe';
import { ContenidoInforme, DefinicionPlantilla } from '../models/Plantilla';
import { calcularResumenUnidad } from '../utils/estadisticas';
import { DatosInforme, informeDatosService } from './informeDatosService';
import { construirDocumentoDesdePlantilla } from './plantillaWordService';

const TIPO_WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Reúne la plantilla, los datos y los textos del informe: lo mismo que usa el PDF
 */
const prepararInforme = async ({
  informe,
  unidades,
  definicion,
}: InformeCompleto): Promise<{ definicion: DefinicionPlantilla; datos: DatosInforme; contenido: ContenidoInforme }> => {
  if (!informe.perfilDocenteId) throw new Error('Este informe no tiene un docente asociado.');

  // Informe hecho con plantilla: usa su propia copia de la plantilla, lo escrito y las notas
  const guardado = informe.contenido;
  if (guardado) {
    const datos = await informeDatosService.reunir({
      perfilDocenteId: informe.perfilDocenteId,
      cursoIds: guardado.cursoIds,
      unidades: guardado.unidades,
    });
    for (const dc of datos.cursos) {
      dc.resultados = (guardado.resultados[dc.curso.id] ?? []).map((r) => ({ ...r, ...calcularResumenUnidad(r.aprobados, r.desaprobados) }));
    }
    return { definicion: guardado.definicion, datos, contenido: guardado.contenido };
  }

  // Informe anterior a las plantillas: se usa la plantilla predeterminada o, si no hay, el oficio de unidad
  const datos = await informeDatosService.reunir({
    perfilDocenteId: informe.perfilDocenteId,
    cursoIds: informe.cursoId ? [informe.cursoId] : [],
    unidades: unidades.map((u) => u.nombreUnidad),
  });
  // El informe guarda una copia de las notas: se usa esa, no las actuales
  for (const dc of datos.cursos) {
    dc.resultados = unidades.map((u) => ({
      nombreUnidad: u.nombreUnidad,
      aprobados: u.cantidadAprobados,
      desaprobados: u.cantidadDesaprobados,
      ...calcularResumenUnidad(u.cantidadAprobados, u.cantidadDesaprobados),
    }));
  }
  return {
    definicion: definicion ?? definicionDelCatalogo('unidad', 'B'),
    datos,
    contenido: {
      campos: {
        numero: informe.numeroInforme,
        a: `${informe.dirigidoANombre}\n${informe.dirigidoACargo}`,
        de: informe.remitenteNombre,
        asunto: informe.asunto,
        fecha: informe.fechaStr,
      },
    },
  };
};

/**
 * Genera el Word (.docx) en el celular y devuelve su ruta (file://...)
 */
export const generarWordInforme = async (datosInforme: InformeCompleto): Promise<string> => {
  const { definicion, datos, contenido } = await prepararInforme(datosInforme);
  const documento = await construirDocumentoDesdePlantilla(definicion, datos, contenido);
  const base64 = await Packer.toBase64String(documento);
  const nombre = `Informe-${datosInforme.informe.numeroInforme.replace(/[^\w-]+/g, '_')}.docx`;
  const archivo = new File(Paths.cache, nombre);
  archivo.write(base64, { encoding: 'base64' });
  return archivo.uri;
};

/**
 * Abre el menú de compartir (Drive, WhatsApp, correo, "Guardar en el dispositivo"...) con el Word
 */
export const compartirWord = async (uri: string): Promise<void> => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: TIPO_WORD,
    UTI: 'org.openxmlformats.wordprocessingml.document',
    dialogTitle: 'Guardar o compartir informe en Word',
  });
};